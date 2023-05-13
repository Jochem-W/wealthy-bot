import { Prisma } from "../clients.mjs"
import { InvalidCustomIdError } from "../errors.mjs"
import { Timeouts } from "../handlers/ready/httpServer.mjs"
import { newSubscriptionMessage } from "../messages/newSubscriptionMessage.mjs"
import { registerUserSelectMenuHandler } from "../utilities/userSelectMenu.mjs"
import { EmbedBuilder } from "discord.js"

export const NewSubscriberSelect = registerUserSelectMenuHandler(
  "subscriber-select",
  async (interaction, [rawUserId]) => {
    if (!rawUserId) {
      throw new InvalidCustomIdError(interaction.customId)
    }

    const userId = parseInt(rawUserId)

    const discordUser = interaction.users.first()
    if (interaction.users.size !== 1 || !discordUser) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Invalid amount of users selected")
            .setDescription("Please select one user and one user only")
            .setColor(0xff0000),
        ],
      })
      return
    }

    let prismaUser
    const oldUser = await Prisma.user.findFirst({
      where: { discordId: discordUser.id },
    })
    const newUser = await Prisma.user.findFirstOrThrow({
      where: { id: userId },
    })
    if (oldUser) {
      await Prisma.user.delete({ where: { id: userId } })
      prismaUser = await Prisma.user.update({
        where: { id: oldUser.id },
        data: { ...newUser, id: oldUser.id, discordId: discordUser.id },
      })
      const timeout = Timeouts.get(userId)
      if (timeout) {
        clearTimeout(timeout)
        Timeouts.delete(userId)
      }
    } else {
      prismaUser = await Prisma.user.update({
        where: { id: userId },
        data: { discordId: discordUser.id },
      })
    }

    await interaction.update(newSubscriptionMessage(prismaUser))
  }
)

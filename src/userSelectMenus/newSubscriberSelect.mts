import { InvalidCustomIdError } from "../errors.mjs"
import { newSubscriptionMessage } from "../messages/newSubscriptionMessage.mjs"
import { linkDiscord } from "../utilities/subscriptionUtilities.mjs"
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

    const prismaUser = await linkDiscord(userId, discordUser.id)

    await interaction.update(newSubscriptionMessage(prismaUser))
  }
)

import { component } from "../models/component.mjs"
import { usersTable } from "../schema.mjs"
import { linkDiscord } from "../utilities/subscriptionUtilities.mjs"
import {
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
  userMention,
  UserSelectMenuBuilder,
} from "discord.js"
import type { MessageActionRowComponentBuilder } from "discord.js"

const newSubscriberSelect = component({
  type: ComponentType.UserSelect,
  name: "subscriber-select",
  async handle(interaction, rawUserId) {
    const userId = parseInt(rawUserId, 10)

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

    const prismaUser = await linkDiscord(
      interaction.client,
      userId,
      discordUser.id,
    )

    await interaction.update(newSubscriptionMessage(prismaUser))
  },
})

export function newSubscriptionMessage(user: typeof usersTable.$inferSelect) {
  const embed = new EmbedBuilder()
    .setTitle("New subscription")
    .setDescription(
      "This could also mean that a member changed their email address.",
    )
    .setFields(
      { name: "Name", value: user.name },
      { name: "Email", value: user.email },
      { name: "Tier", value: user.lastPaymentTier },
    )
    .setTimestamp(user.lastPaymentTimestamp)

  if (user.discordId) {
    embed.addFields({ name: "Member", value: userMention(user.discordId) })
    return { embeds: [embed], components: [] }
  }

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
        new UserSelectMenuBuilder()
          .setPlaceholder("Select the corresponding user")
          .setCustomId(newSubscriberSelect(user.id.toString(10)))
          .setMaxValues(1)
          .setMinValues(1),
      ),
    ],
  }
}

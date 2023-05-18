import { NewSubscriberSelect } from "../userSelectMenus/newSubscriberSelect.mjs"
import { userSelectMenu } from "../utilities/userSelectMenu.mjs"
import type { User } from "@prisma/client"
import {
  ActionRowBuilder,
  EmbedBuilder,
  userMention,
  UserSelectMenuBuilder,
} from "discord.js"
import type { MessageActionRowComponentBuilder } from "discord.js"

export function newSubscriptionMessage(user: User) {
  const embed = new EmbedBuilder()
    .setTitle("New subscription")
    .setFields(
      { name: "Name", value: user.name },
      { name: "Email", value: user.email },
      { name: "Tier", value: user.lastPaymentTier }
    )
    .setTimestamp(user.lastPaymentTime)

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
          .setCustomId(
            userSelectMenu(NewSubscriberSelect, [user.id.toString()])
          )
          .setMaxValues(1)
          .setMinValues(1)
      ),
    ],
  }
}

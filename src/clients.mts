import { Variables } from "./variables.mjs"
import { Octokit } from "@octokit/rest"
import { Client, GatewayIntentBits, Partials } from "discord.js"

export const Discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildScheduledEvent,
    Partials.ThreadMember,
  ],
})
Discord.rest.setToken(Variables.discordBotToken)
export const GitHubClient = new Octokit({ auth: Variables.githubToken })

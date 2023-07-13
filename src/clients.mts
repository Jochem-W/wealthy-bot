import { Variables } from "./variables.mjs"
import { Octokit } from "@octokit/rest"
import { PrismaClient } from "@prisma/client"

export const GitHubClient = new Octokit({ auth: Variables.githubToken })
export const Prisma = new PrismaClient()

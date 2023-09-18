import { Variables } from "./variables.mjs"
import { Octokit } from "@octokit/rest"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

export const GitHubClient = new Octokit({ auth: Variables.githubToken })
export const Db = postgres(Variables.databaseUrl)
export const Drizzle = drizzle(Db)

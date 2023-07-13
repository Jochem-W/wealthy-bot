import { Variables } from "./variables.mjs"
import vision from "@google-cloud/vision"
import { Octokit } from "@octokit/rest"
import { PrismaClient } from "@prisma/client"

export const GitHubClient = new Octokit({ auth: Variables.githubToken })
export const Prisma = new PrismaClient()
export const ImageAnnotator = new vision.ImageAnnotatorClient()

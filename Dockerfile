# Set-up build image
FROM node:20-slim AS builder
ENV NODE_ENV=development

WORKDIR /app

# Copy package.json, lockfile, .npmrc
COPY ["pnpm-lock.yaml", "package.json", ".npmrc", "./"]

# Install build tools
RUN apt-get update && \
    apt-get -y install build-essential openssl python3 && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g pnpm && \
    pnpm install

# Copy all files to working directory
COPY . .

# Compile Typescript and remove dev packages
RUN pnpm tsc && \
    pnpm prune --prod

# Set-up running image
FROM node:20-slim
ARG commit_hash
ENV NODE_ENV=production \
    COMMIT_HASH=$commit_hash
WORKDIR /app

# Install openssl
RUN apt-get update && \
    apt-get -y install openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy all files (including source :/)
COPY --from=builder /app .

# Run
CMD ["node", "dist/index.mjs"]

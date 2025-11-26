FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/dist ./dist

# MCP servers communicate via stdio
ENTRYPOINT ["node", "dist/index.js"]

# Dockerfile
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src/ src/
COPY tsconfig.json .

# Build the application
RUN bun build ./src/server.ts --target=bun --outdir=./dist

# Runtime stage
FROM oven/bun:1

WORKDIR /app

# Copy built files  
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .

# Create directory for temporary file storage
RUN mkdir -p /tmp/ripper

EXPOSE 3000
ENV NODE_ENV=production

ENTRYPOINT ["bun", "run", "./dist/server.js"]
CMD ["--transport=stdio", "--workspaceDir=/ws"]
ARG NODE_VERSION=22.13.0
ARG NODE_ALPINE_VERSION=23-alpine3.20

# Build stage
FROM node:${NODE_ALPINE_VERSION} AS builder

WORKDIR /app

# Copy package files for workspace
COPY package*.json ./
COPY packages/*/package.json ./packages/
COPY apps/*/package.json ./apps/

# Install dependencies including dev dependencies
RUN npm install

# Install additional tools
RUN npm install -g ts-node nodemon

# Copy source code
COPY . .

# Clean and rebuild
RUN npm run clean
RUN NODE_ENV=production npm install

# Final stage
FROM node:${NODE_ALPINE_VERSION}

WORKDIR /app

# Install global tools in final stage
RUN npm install -g ts-node nodemon

# Copy built application
COPY --from=builder /app .

# Set production environment
ENV NODE_ENV=production

ARG NODE_ENV=development

EXPOSE 3000

CMD ["npm", "run", "dev"]

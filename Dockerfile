
# Stage 1: Build Client
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Server
FROM node:18-alpine AS server-build
WORKDIR /app/server
# Increase memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
# Generate Prisma Client
ARG DATABASE_URL
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runtime
FROM node:18-alpine
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy built server
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/package*.json ./server/
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/prisma ./server/prisma

# Copy built client to root /app/client/dist
# This matches path.join(__dirname, '../../../client/dist') in server/dist/src/index.js
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/server
EXPOSE 3000

# We use npm start to ensure migrations and seed are run
# Ensure database is up-to-date and seeded before starting
CMD npx prisma db push --accept-data-loss && npx prisma db seed && npm run start

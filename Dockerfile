
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

# Copy built client to expected location
# In index.ts we pointed to ../../client/dist relative to server/src/index.ts
# but in dist/index.js, it is relative to server/dist.
# index.js is in /app/server/dist/src/index.js
# path.join(__dirname, '../../client/dist') -> /app/server/dist/src -> ../.. -> /app/server -> /app/server/client/dist
COPY --from=client-build /app/client/dist ./server/client/dist

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/server
EXPOSE 3000

# We use npm start to ensure migrations and seed are run
CMD ["npm", "run", "start"]

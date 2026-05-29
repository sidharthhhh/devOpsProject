# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY tsconfig.json ./
COPY proto/ ./proto/

RUN npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY --from=build /app/dist ./dist
COPY --from=build /app/proto ./proto
COPY --from=build /app/src/db/migrations/ ./dist/db/migrations/

EXPOSE 50051 50052

CMD ["node", "dist/index.js"]

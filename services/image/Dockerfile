FROM node:20-alpine AS deps
WORKDIR /app
COPY image/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS build
WORKDIR /app
COPY image/package*.json ./
RUN npm ci
COPY shared ./shared
COPY image .
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 4004
CMD ["node", "dist/index.js"]

# ---- Build : compile le TypeScript ----
FROM node:22-slim AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Image finale : dépendances de production uniquement, sans root ----
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /usr/src/app

# netcat : utilisé par docker-compose pour attendre MongoDB en local
RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /usr/src/app/dist ./dist
# Logo et cachet utilisés par les reçus PDF (lus depuis src/assets à l'exécution)
COPY src/assets ./src/assets

RUN mkdir -p public/receipts public/uploads && chown -R node:node /usr/src/app
USER node

EXPOSE 4000
CMD ["node", "dist/app.js"]

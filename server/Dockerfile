FROM node:22-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json

RUN npm ci -w server --include-workspace-root

COPY server ./server

RUN npx prisma generate --schema server/prisma/schema.prisma \
  && npm run build -w server

WORKDIR /app/server

ENV NODE_ENV=production

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed.js && node dist/index.js"]

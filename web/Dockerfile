FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json

RUN npm ci -w web --include-workspace-root

COPY web ./web

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build -w web

WORKDIR /app/web

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]

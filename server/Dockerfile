FROM node:22-slim AS builder

WORKDIR /app

COPY server/package.json ./
RUN npm install

COPY server/tsconfig.json ./
COPY server/src/ ./src/

RUN npx tsc && npx tsc-alias -p tsconfig.json

FROM node:22-slim

WORKDIR /app

COPY --from=builder /app/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist/ ./dist/

CMD ["node", "dist/index.js"]

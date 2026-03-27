FROM node:22-slim AS builder

WORKDIR /app

COPY worker/package.json ./
RUN npm install

COPY worker/tsconfig.json ./
COPY worker/src/ ./src/

RUN npx tsc && npx tsc-alias -p tsconfig.json

FROM node:22-slim

WORKDIR /app

COPY --from=builder /app/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist/ ./dist/

CMD ["node", "dist/index.js"]

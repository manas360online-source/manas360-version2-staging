#Production Dockerfile for MANAS360 backend (Node.js + Prisma + PostgreSQL)
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache openssl openssl-dev python3 build-base
RUN npm install -g npm@latest
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build && npx prisma generate

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=build /app .
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "dist/server.js"]

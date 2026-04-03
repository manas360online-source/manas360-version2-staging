#Production Dockerfile for MANAS360 backend (Node.js + Prisma + PostgreSQL)
# ---------- BUILD STAGE ----------
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

# Install build dependencies TEMPORARILY
RUN apk add --no-cache --virtual .build-deps \
	python3 \
	build-base \
	openssl-dev

RUN npm install --legacy-peer-deps

COPY . .

RUN rm -f .env

ENV DATABASE_URL=postgresql://manas360:manas360@db:5432/manas360

RUN npm run build && npx prisma generate

# REMOVE build dependencies (IMPORTANT)
RUN apk del .build-deps


# ---------- PRODUCTION STAGE ----------
FROM node:20-alpine

WORKDIR /app

# Only runtime dependency
RUN apk add --no-cache openssl

COPY --from=build /app .

ENV NODE_ENV=production

EXPOSE 5000

# TEMP FIX: remove migrate from startup
CMD ["node", "dist/server.js"]

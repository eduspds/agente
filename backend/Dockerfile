# Stage 1: Build
FROM node:20-alpine AS builder

# Dependências de compilação nativa (bcrypt, Prisma)
RUN apk add --no-cache openssl python3 make g++ libc6-compat

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# NUNCA use --ignore-scripts aqui — bcrypt precisa compilar
RUN npm ci

RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]

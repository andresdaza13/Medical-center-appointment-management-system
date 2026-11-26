# API NestJS de Piedrazul para la nube (Render, plan gratuito: 512 MB de RAM).
#
# Dos etapas (multi-stage):
#   1. "builder": instala TODAS las dependencias (incluidas las de desarrollo:
#      TypeScript, Nest CLI) y compila src/ → dist/.
#   2. imagen final: solo dependencias de producción + dist/. Las herramientas
#      de compilación no viajan a producción: imagen más pequeña y con menos
#      superficie de ataque.

# ---------- Etapa 1: compilar ----------
FROM node:20-alpine AS builder
# Prisma necesita OpenSSL; la imagen alpine no lo trae.
RUN apk add --no-cache openssl
WORKDIR /app

# Primero solo lo necesario para instalar dependencias: si el código cambia
# pero package*.json no, Docker reutiliza esta capa en caché (builds rápidos).
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- Etapa 2: ejecutar ----------
FROM node:20-alpine
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# Solo dependencias de producción. El "postinstall" genera el cliente de Prisma.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Nunca ejecutar como root: si alguien explotara una vulnerabilidad de la API,
# no tendría permisos de administrador dentro del contenedor.
USER node

EXPOSE 3000
# 1) aplica las migraciones pendientes (no crea nuevas), 2) arranca la API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
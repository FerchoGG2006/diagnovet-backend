# ============================================
# DiagnoVET Backend - Dockerfile
# ============================================
# Imagen optimizada para Cloud Run
# Multi-stage build para reducir tamaño final

# --- Etapa de construcción ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias primero (mejor caching)
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para build)
RUN npm ci --only=production

# --- Etapa de producción ---
FROM node:18-alpine AS production

# Instalar dumb-init para manejo correcto de señales
RUN apk add --no-cache dumb-init

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Usuario no-root para seguridad
USER node

WORKDIR /app

# Copiar dependencias desde builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copiar código fuente
COPY --chown=node:node package*.json ./
COPY --chown=node:node index.js ./
COPY --chown=node:node src ./src

# Exponer puerto
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Usar dumb-init como PID 1
ENTRYPOINT ["dumb-init", "--"]

# Comando por defecto
CMD ["node", "index.js"]

# ==============================================================
# Knots — Production Multi-Stage Dockerfile
# ==============================================================

# --- Stage 1: Build Frontend SPA ---
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Stage 2: Install Server Dependencies ---
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# --- Stage 3: Production Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy server and built client
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/ ./server
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 3000

WORKDIR /app/server
CMD ["node", "index.js"]

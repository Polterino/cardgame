# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# VITE_SOCKET_URL must be passed at build time (e.g. http://yourdomain.com:3001)
ARG VITE_SOCKET_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

ARG VITE_ALLOWED_HOST
ENV VITE_ALLOWED_HOST=$VITE_ALLOWED_HOST

RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install the lightweight static file server
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]

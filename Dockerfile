FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/cadastro-missionario/package*.json ./
RUN npm ci
COPY frontend/cadastro-missionario/ ./
RUN npm run build

FROM node:20-alpine AS backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci
RUN npx prisma generate
RUN npm prune --omit=dev

FROM node:20-alpine AS production

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app/backend
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 3001

CMD ["node", "src/server.js"]

# ── Stage 1: Install deps ───────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma client + schema (needed for migrate at runtime if desired)
COPY --from=builder /app/node_modules/.prisma          ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma          ./node_modules/@prisma
COPY --from=builder /app/prisma                        ./prisma

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]

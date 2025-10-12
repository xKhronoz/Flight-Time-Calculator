FROM node:24-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN apk add --no-cache --virtual .build-deps \
        gcc \
        g++ \
        make \
    && npm ci --include=dev \
    && apk del .build-deps

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs
USER nextjs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
# Run migrations at container start, then boot Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]

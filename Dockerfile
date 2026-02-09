# ---------- Base image ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Production ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only what we need
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY swagger.yaml ./

# If uploads should persist, DON'T bake them into the image
# They should be mounted as a volume instead
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "dist/index.js"]

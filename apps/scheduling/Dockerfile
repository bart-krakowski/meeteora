FROM node:24-alpine AS base
RUN npm install -g pnpm@11.1.0
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=scheduling
RUN pnpm --filter scheduling deploy --prod /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/scheduling/dist ./dist
USER node
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/main.js"]

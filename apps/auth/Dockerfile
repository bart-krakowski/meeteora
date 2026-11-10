FROM node:24-alpine AS base
RUN npm install -g pnpm@11.1.0
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=auth
RUN pnpm --filter auth deploy --prod /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/auth/dist ./dist
USER node
EXPOSE 3003
CMD ["node", "dist/main.js"]

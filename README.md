# meeteora

Scheduling SaaS built on [TanStack Time](../tanstack/time).

- `apps/web` — Next.js frontend
- `apps/api` — NestJS HTTP gateway; forwards requests to services over RabbitMQ
- `apps/scheduling` — NestJS RabbitMQ microservice (Drizzle + Postgres), authoritative slot generation via `generateSlots` and booking creation
- `apps/notifications` — NestJS RabbitMQ worker consuming booking events
- `packages/contracts` — shared queue names, message patterns, events and payload types
- `packages/db` — the one shared Postgres database: Drizzle schema, client factory and migrations for every service
- `vendor/*` — `@tanstack/time` and `@tanstack/react-time` packed from the local repo (not on npm yet)

## Architecture

```
web ──HTTP──▶ api ──RPC (queue: scheduling)──▶ scheduling ──▶ Postgres
                                                   │
                                event (queue: notifications)
                                                   ▼
                                             notifications
```

| Pattern            | Kind  | Handler       |
| ------------------ | ----- | ------------- |
| `scheduling.health` | RPC  | scheduling    |
| `slots.list`       | RPC   | scheduling    |
| `bookings.create`  | RPC   | scheduling    |
| `booking.created`  | event | notifications |

## Setup

```sh
cp .env.example .env
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm dev
```

Web: http://localhost:3000 · API: http://localhost:3001 (`/health`, `GET /slots?from=&to=`, `POST /bookings {"ruleId","start"}`) · RabbitMQ UI: http://localhost:15672 (`meeteora`/`meeteora`)

`pnpm dev` builds `@meeteora/contracts` once up front. After editing contracts, rerun `pnpm --filter @meeteora/contracts build`.

## Full stack in Docker

```sh
docker compose up --build
```

The scheduling service runs migrations on start. Postgres is exposed on host port `5433`, RabbitMQ on `5672`.

## Database

All services share one Postgres database. Schema, migrations and the client live in `packages/db` (`@meeteora/db`); a service that needs storage depends on it and connects with `DATABASE_URL`. Do not add per-service schemas or migration folders.

Edit `packages/db/src/schema.ts`, then:

```sh
pnpm db:generate
pnpm db:migrate
```

## Updating TanStack Time

```sh
pnpm vendor:time
pnpm install
```

Reads from `../tanstack/time` by default; override with `TANSTACK_TIME_DIR`.

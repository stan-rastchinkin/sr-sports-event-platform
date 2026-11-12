# Sports Event Platform

Backend service for scheduling, managing, and retrieving competitive sports events. This repository currently wires the toolchain and a runnable HTTP shell. Scheduling, lifecycle, and search use cases are not implemented yet.

The layered design (HTTP, application commands and queries, domain, persistence) is described in [.docs/domain.md](.docs/domain.md).

## Stack

- Node.js 26 (`engines.node` is `>=26`). Corepack is installed separately because Node 26 does not ship it.
- TypeScript 6, strict. `module` and `moduleResolution` are `NodeNext`. Development runs the TypeScript source with `tsx`. Production is compiled with `tsc` and run with Node.
- Yarn 4.18 (Berry), `node-modules` linker, `enableScripts: true`.
- Fastify 5, with Pino 10 through Fastify's `logger` option. `pino-pretty` is used only when `NODE_ENV=development`.
- Zod 4 for environment and HTTP contracts. Route handlers use `z.output` of the parsed schema. Every route declares an explicit Zod response schema.
- OpenAPI 3.1 via `@fastify/swagger` 9 and `@fastify/swagger-ui` 5. Zod schemas are converted with `@fastify/type-provider-zod`. The UI is at `/documentation`.
- TypeORM 1 with an explicit `DataSource` and `EntitySchema` mappings in `src/persistence/schemas`. No decorator metadata. Driver is `pg`. `synchronize` is off. Migrations live in the root `migrations/` folder and are applied with the TypeORM CLI, not on server startup.
- PostgreSQL 18 in Docker Compose. One instance. `docker/postgres/init/01-databases.sql` creates `sports_events` and `sports_events_test` the first time the data volume is created.
- ESLint 10 with `typescript-eslint` `recommendedTypeChecked` on `src/**/*.ts` (`projectService: true`). Tests and migrations use the syntactic recommended rules.
- Jest runs the JavaScript emitted by `tsc`. It does not compile TypeScript.

Dependencies are constructed in `src/bootstrap.ts` and passed into the Fastify app. There is no service locator.

## Prerequisites

- Node.js 26
- Corepack (`npm install -g corepack && corepack enable`)
- Docker with Compose v2

```sh
corepack enable
yarn install
```

## Environment

Scripts load one connection string, `DATABASE_URL`.

| File | Loaded by | Database |
|---|---|---|
| `.env.dev` | `yarn dev`, `yarn start`, migration scripts | `sports_events` |
| `.env.test` | `yarn test` | `sports_events_test` |

Both files use user `sports`, password `sports`, host `localhost`, port `5432`. Only the database name changes. The service listens on `0.0.0.0:3000`.

## Postgres

```sh
yarn db:up
yarn db:down
yarn db:seed
```

`yarn db:seed` loads `.env.dev` and upserts 5 sports and 20 teams into `sports_events`. It does not insert events. Running it again updates those rows and leaves any events you created in place. It refuses to run unless `DATABASE_URL` points at `sports_events`. Apply migrations first.

`01-databases.sql` runs only when the data volume is empty. Compose does not set `POSTGRES_DB`, so the image also creates a database named after the user, `sports`. The application uses `sports_events` and `sports_events_test`. If either of those was never created, remove the volume and start again:

```sh
docker compose down -v
yarn db:up
```

## Migrations

Generation and run use the dev database. The CLI DataSource is `src/persistence/data-source.ts`. Table mappings are the `entitySchemas` array in `src/persistence/schemas/index.ts`. There is no sports-event table in this scaffold, so the schema list is empty.

```sh
yarn migration:show
yarn migration:generate -- migrations/<Name>
yarn migration:create -- migrations/<Name>
yarn migration:run
yarn migration:revert
```

`migration:generate` compares `entitySchemas` with `sports_events` and writes `migrations/<timestamp>-<Name>.ts`. With an empty schema list and an unchanged database, TypeORM exits with code 1 because there is nothing to generate. Tests that need tables later should run migrations against `.env.test` first. The health test does not apply migrations.

## Run

```sh
yarn dev
```

`yarn dev` runs `src/main.ts` with `tsx watch` and loads `.env.dev`. `tsx` restarts the process when source files change.

Production uses the compiler, then Node:

```sh
yarn build
yarn start
```

`yarn build` is `tsc -p tsconfig.build.json`. `yarn start` runs `node --env-file=.env.dev dist/main.js`.

- Health: `GET http://localhost:3000/health` returns `{ "status": "ok" }` after `SELECT 1`.
- OpenAPI UI: `http://localhost:3000/documentation`.

## Checks

```sh
yarn typecheck
yarn lint
yarn test
```

`yarn typecheck` is `tsc --noEmit` over `src`, `test`, and `migrations`. Unit tests live in `test/unit`. Integration tests live in `test/integration`. `yarn test` compiles `src` and `test` into `dist-test`, then runs Jest on both folders against `sports_events_test`. CI runs install, typecheck, lint, Postgres, and tests on Node 26.

## Domain assumptions

These are exercise assumptions from [.docs/domain.md](.docs/domain.md) section 10, not confirmed Sportradar business requirements.

1. Every sporting event has exactly two participants.
2. Participants are initially represented as values rather than independent aggregates.
3. Newly created events are always scheduled.
4. Only scheduled events can be rescheduled or cancelled.
5. Finished and cancelled events are terminal.
6. In-progress events cannot be suspended.
7. Match results and in-game statistics are outside the initial scope.
8. The platform does not initially integrate with external sports-data providers.

# Music Room

## Prerequisites

- [Docker](https://www.docker.com/) (for Supabase)
- [pnpm](https://pnpm.io/) (backend)
- [JDK 11+](https://adoptium.net/) (mobile — Android Studio installs one)

## Environment

Copy the local environment file and fill in the placeholder ports:

```bash
cp .env.example .env
```

The `.env.example` uses `YOUR_*` placeholders. Replace them with actual port numbers (suggested defaults below):

| Variable | Description | Default |
|---|---|---|
| `API_HOST` | Fastify listen address | `0.0.0.0` |
| `API_PORT` | Fastify listen port | `3000` |
| `SUPABASE_API_PORT` | Supabase REST / Auth API | `54321` |
| `SUPABASE_DB_PORT` | PostgreSQL main port | `54322` |
| `SUPABASE_DB_SHADOW_PORT` | Shadow database (migrations) | `54320` |
| `SUPABASE_DB_POOLER_PORT` | PgBouncer connection pooler | `54329` |
| `SUPABASE_STUDIO_PORT` | Supabase Studio UI | `54333` |
| `SUPABASE_INBUCKET_PORT` | Inbucket email testing | `54324` |
| `SUPABASE_ANALYTICS_PORT` | Logflare analytics | `54327` |
| `POSTGRES_HOST` | PostgreSQL hostname | `127.0.0.1` |
| `POSTGRES_PORT` | PostgreSQL port (same as `SUPABASE_DB_PORT`) | `54322` |
| `POSTGRES_DB` | Database name | `postgres` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `DATABASE_URL` | Full connection string | `postgres://postgres:postgres@127.0.0.1:54322/postgres` |
| `SUPABASE_URL` | Supabase API base URL (uses `SUPABASE_API_PORT`) | `http://127.0.0.1:54321` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`PUBLISHABLE_KEY` in `pnpm db:status`) | `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH` (local CLI default) |

Adjust the ports if they conflict with other services on your machine. Make sure `POSTGRES_PORT` and `SUPABASE_DB_PORT` stay in sync, that `DATABASE_URL` reflects the chosen port, and that `SUPABASE_URL` uses `SUPABASE_API_PORT`.

If no `.env` file exists, `make` creates one automatically with the defaults above.

## Makefile

| Command | Description |
|---|---|
| `make install` | Install all dependencies (backend + mobile) |
| `make backend` | Install, start Supabase, then run the Fastify API |
| `make mobile` | Build the mobile app (debug APK) |
| `make clean` | Remove build artifacts (keeps dependencies) |
| `make fclean` | Remove everything: deps, builds, and Supabase Docker assets |
| `make re` | Full clean then reinstall and start the backend |

### Backend sub-commands

| Command | Description |
|---|---|
| `make backend start` | Start Supabase and the API without reinstalling |
| `make backend stop` | Stop the API process and Supabase |
| `make backend reset` | Reset Supabase database, then run the API |
| `make backend studio` | Open Supabase Studio in the browser |

### Mobile sub-commands

| Command | Description |
|---|---|
| `make mobile start` | Install and launch on a connected device/emulator |
| `make mobile stop` | Stop the app on the device |
| `make mobile reset` | Clean, rebuild, and launch on device |

### Misc

| Command | Description |
|---|---|
| `make env sync` | Sync `.env` into Supabase and Bruno configs |
| `make doc` | Open the API documentation (Swagger UI) in the browser |

### Equivalent manual commands

```bash
# Backend
cd backend
pnpm install
pnpm db:start
pnpm dev

# Mobile
cd mobile
./gradlew assembleDebug
```

### Check the API

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## CI

The GitHub Actions CI checks ESLint with zero warnings and Prettier on non-draft pull requests. It exits successfully right away when no `backend/` files changed. Declarative branch protection lives in `.github/settings.yml` and requires the `backend-quality` check before merge through the Probot Settings app.

Configurable ports are declared in `.env` at the repository root. The `pnpm db:start` command copies them into the Supabase and Bruno configuration files because those tools read their own files.

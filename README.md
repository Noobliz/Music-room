# Music Room

## Backend

Copy the local environment file:

```bash
cp .env.example .env
```

Start the full backend from the repository root:

```bash
make backend setup
```

This command installs dependencies, syncs the local configuration, starts Supabase, then runs the Fastify API in the same terminal.

Restart without running the setup again:

```bash
make backend start
```

Stop the full backend:

```bash
make backend stop
```

Reset Supabase and restart the API:

```bash
make backend reset
```

Remove backend dependencies/build artifacts and Supabase Docker assets:

```bash
make fclean
```

The GitHub Actions CI checks ESLint with zero warnings and Prettier on non-draft pull requests. It exits successfully right away when no `backend/` files changed. Declarative branch protection lives in `.github/settings.yml` and requires the `backend-quality` check before merge through the Probot Settings app.

Equivalent manual commands:

```bash
cd backend
pnpm install
pnpm db:start
pnpm dev
```

Check the API:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

Configurable ports are declared in `.env` at the repository root. The `pnpm db:start` command copies them into the Supabase and Bruno configuration files because those tools read their own files.

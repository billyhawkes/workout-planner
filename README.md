# Training Ledger

A private Apple Health workout dashboard and MCP server built with TanStack
Start, Effect HttpApi, Paraglide, Base UI, and KrakStack registry components.

The application reads `export.zip` locally and does not upload the archive,
clinical records, or workout routes. A streaming importer extracts only workout
summaries into a PostgreSQL database. You can also add and edit planned or
completed workouts in the dashboard.

## Import

Place the Apple Health archive at `export.zip`, then run:

```sh
bun install
bun run db:migrate
bun run health:import
```

Set `DATABASE_URL` to the PostgreSQL database used by the app before migrating,
importing, or starting the development server.

Re-run the command whenever you replace `export.zip` with a newer export.
Imports are idempotent: a stable Apple Health workout identity is upserted, so
rerunning an import does not create duplicate sessions.

## Run

Start the UI, API, and MCP endpoint together:

```sh
bun run dev
```

Available endpoints:

- Dashboard: `http://localhost:3000`
- Workout API: `http://localhost:3000/api/workouts`
- Summary API: `http://localhost:3000/api/workouts/summary?days=28`
- OpenAPI: `http://localhost:3000/api/openapi.json`
- MCP: `http://localhost:3000/api/mcp`

`opencode.json` registers the local HTTP MCP endpoint as `apple-health`.
Restart OpenCode after starting the app, then verify it with:

```sh
opencode2 mcp list
```

The generated MCP tools expose the GET operations from the same Effect HttpApi
contract used by the dashboard. Workout writes remain available through the UI
and HTTP API.

## Checks

```sh
bun run type:check
bun run build
bun run test
bun run lint
bun run fmt
```
# health

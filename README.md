# Hours Worked

Desktop-first remote work tracker for hourly client billing. The app supports parallel timers for separate clients, manual session entry, draft/finalized invoice generation, PDF/CSV exports, and a cron-ready monthly close endpoint.

## Stack

- `apps/web`: Next.js App Router UI and server actions
- `packages/shared`: shared types, validation, and billing logic
- `data/hours-worked.json`: local file-backed data store for immediate use
- `supabase/migrations`: cloud-ready schema for a future Supabase-backed deployment

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm start
```

## Notes

- Local development uses the JSON file in `data/`.
- The invoice automation endpoint is `POST /api/cron/monthly-close`.
- The endpoint expects `Authorization: Bearer <cron secret>` matching the Settings page or the JSON data file.

## Railway

This app can be deployed to Railway for private single-user use.

- Attach a volume mounted at `/data`.
- Set `HOURS_DATA_FILE=/data/hours-worked.json`.
- Keep the service at a single replica.
- Change the default cron secret after the first deploy.

The repo includes [railway.json](./railway.json), which configures:

- `pnpm build` as the build command
- `pnpm start` as the start command
- `/api/health` as the healthcheck path
- `/data` as the required mount path

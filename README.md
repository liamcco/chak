# Körnamnsvalet

A one-time, Administrator-led choir naming election built for Vercel with Next.js, Drizzle, and Postgres.

## Development

Copy `.env.example` to `.env.local` and set strong local secrets. Start Postgres with
`docker compose up -d`, then apply the committed migration with `bun run db:migrate`.
Migrations run only through that command, never as part of `bun run build`.

Use `bun run dev` for local development and `bun run test:unit` for unit tests. Before `bun run test`
or `bun run test:e2e`, set both `POSTGRES_URL` and `TEST_POSTGRES_URL` to different URLs; the latter
must be a dedicated disposable database. Those commands refuse to run otherwise and apply migrations
to the test database. Playwright uses it plus separate browser contexts for an authenticated Administrator
and an unauthenticated visitor.

## Design documents

- [Product design](docs/product-design.md)
- [Domain language](CONTEXT.md)
- [Architecture decisions](docs/adr/)

# CommerceOS local setup

## Prerequisites

- Node.js 20+
- npm
- A Supabase project (Postgres + Auth)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

Copy the example file and fill in values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `DATABASE_URL` | Session-mode pooler URL (port `5432`) — required for Prisma interactive transactions. App sets `connection_limit=1` in production. |
| `DIRECT_URL` | Session-mode pooler URL (port `5432`) for migrations when direct `db.*` host is unreachable |
| `SEED_ADMIN_SUPABASE_USER_ID` | UUID of the Supabase Auth admin user |
| `SEED_ADMIN_EMAIL` | Defaults to `admin@kina2.com` |

Also copy the same vars into `.env` if you want Prisma CLI to pick them up without `--env-file` (Prisma loads `.env` by default).

## 3. Supabase Auth

1. In the Supabase dashboard, enable **Email** auth.
2. Create a user with email `admin@kina2.com` (or your `SEED_ADMIN_EMAIL`).
3. Copy that user’s UUID into `SEED_ADMIN_SUPABASE_USER_ID`.

If you seed before setting the UUID, set `ALLOW_ADMIN_EMAIL_LINK=1` in `.env.local` for a one-time link of the seed email to the Supabase user (leave that flag unset in production).

## 4. Migrate and seed

```bash
npx prisma migrate deploy
# or during local development:
npx prisma migrate dev

npm run db:seed
```

Seed creates:

- Tenant **KIN A2 Milk** (`kin-a2`)
- Admin user + owner membership
- Sample categories
- Sample products

## 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

## Useful scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run db:seed` | Run Prisma seed |
| `npm run db:studio` | Prisma Studio |

## Notes

- Product and ABA QR images upload to a public Supabase Storage bucket; payment proofs use a private bucket and are served only through an authenticated admin route.
- Guest and authenticated checkout are live on the storefront; orders are managed under `/admin/orders`.
- Telegram Mini App auth and channel broadcasts live under `src/channels/telegram` (set `TELEGRAM_BOT_TOKEN` and related env vars to enable them).
- Stock is an `isAvailable` flag, not a quantity. Account deletion and retention flows are not implemented yet.
- `GET /api/v1/health` runs `SELECT 1` against Postgres and returns **503** when the database is unreachable.
- Migrations revoke Supabase `anon` / `authenticated` table privileges and enable RLS on app tables (Prisma still uses the database role). The `payment-proofs` Storage bucket is private; proofs are never served via `getPublicUrl`.

## Timing / performance checks

Set `TIMING_DEBUG=1` in `.env.local` (restart `npm run dev`).

Admin pages show a yellow badge with:

- `session` — Supabase Auth + membership lookup (often ~0ms on the page if layout already cached it)
- `products` / `categories` — catalog query time
- `total` — page server work

Server terminal also logs `[timing]` lines for `auth.getUser`, `admin.session`, and each page.

Compare Pakistan vs Cambodia on the same routes (`/admin`, `/admin/products`, `/admin/categories`).

## Vercel + Supabase connection pool

Runtime uses Supabase **session mode** (pooler port `5432`) so Prisma interactive transactions (checkout) work. Session pool size defaults to **15 connections for the whole project** — shared by every Vercel deploy, preview, and local `npm run dev`.

If you see `max clients reached in session mode`:

1. **Remove `NODE_ENV=development` from Vercel** — the app forces `connection_limit=1` on Vercel, but other tools may not.
2. **Pause or delete old Vercel projects** that still point at the same `DATABASE_URL`.
3. **Avoid running local dev against production** while testing the live Mini App.
4. In Supabase → **Database → Connection pooling**, increase session pool size if your plan allows it.
5. Redeploy after env changes; close and reopen the Telegram Mini App to drop stale JS.

## Address autocomplete

Delivery checkout uses the CommerceOS endpoint `/api/location/search`, which calls the public Photon
service backed by OpenStreetMap data. It requires no API key and is limited to short, debounced
searches with up to eight normalized results. The default bias is Cambodia (`KH`) and Phnom Penh
for the current market; override `PHOTON_BASE_URL`, `PHOTON_COUNTRY_CODE`, or `PHOTON_BIAS_CITY`
per deployment when needed.

Photon/OpenStreetMap is free and open source, but the public endpoint does not guarantee
availability or high-volume commercial capacity. If usage grows, keep the checkout endpoint and
normalized DTO unchanged while pointing `PHOTON_BASE_URL` at a self-hosted Photon instance.
Manual address fields always remain available when there are no results or Photon is unavailable.

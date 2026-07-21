# CommerceOS

Multi-tenant commerce platform. Telegram Mini Apps, web storefronts, and other channels consume the same commerce core. **KIN A2 Milk** is the first seeded tenant.

## Stack

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS + ShadCN UI
- Supabase (Postgres, Auth, Storage)
- Prisma ORM
- Zod + Vitest

## Architecture (pragmatic)

```
src/
  app/(admin)          Admin dashboard routes
  app/api/v1           Versioned HTTP API
  modules/*            Feature modules (services → repositories)
  channels/telegram    Telegram adapter (isolated)
  shared/*             env, db, auth, money, errors
  ui/*                 Design system + admin shell
```

Rules:

- Business logic lives in module **services**, not React components or route handlers
- Every business row is scoped by `tenantId`
- Admin auth (Supabase) is separate from future customer/channel auth
- Money is stored as integer minor units (`priceMinor`)

## Quick start

See [docs/setup.md](docs/setup.md) for Supabase credentials, migrations, and seed.

```bash
npm install
cp .env.example .env.local
# fill env values, then:
npx prisma migrate dev
npm run db:seed
npm run dev
```

Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Phase 1 scope

Included:

- Foundation (env, Prisma schema, money helpers, lint/test)
- Admin authentication (Supabase)
- Admin shell
- Product CRUD
- KIN seed data

Not included yet:

- Storefront / Telegram shopping
- Checkout & order ops UI
- Promotions, loyalty, referrals, recurring, analytics
- SaaS billing / tenant onboarding

## License

Private — all rights reserved.

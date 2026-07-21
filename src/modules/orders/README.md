# Orders module

Owns carts, guest checkout, order creation, and order status transitions for CommerceOS.

## Layout

| Path | Role |
|------|------|
| `services/order-service.ts` | **Application service** — channel-agnostic `createOrder` / `createOrderInTransaction` |
| `services/checkout-service.ts` | Web guest checkout adapter (cart → customer → `createOrderInTransaction`) |
| `services/order-status-service.ts` | **Only** place that advances `orders.status` after creation |
| `services/order-admin-service.ts` | Admin list/detail orchestration (filters, pagination, timeline actors) |
| `services/cart-service.ts` | Server-side cart mutations |
| `actions/order-admin-actions.ts` | Thin admin status update Server Action |
| `repositories/` | Prisma access, always tenant-scoped |
| `components/admin/` | Admin order list/detail UI |
| `actions/` | Thin Server Actions (UI entry) |
| `schemas/` | Zod input + tenant checkout config |

HTTP routes under `/api/v1/[tenantSlug]/checkout` and Server Actions must stay thin: validate → call services → respond. Do not create orders in route handlers or React components.

## Admin order management

Routes:

- `/admin/orders` — paginated list with search/filters
- `/admin/orders/[orderId]` — detail, timeline, status update

Status updates always call `transitionOrderStatus` with `createdBy = session.userId`.  
UI next-status options come from `getAllowedNextStatuses` (narrows pickup vs delivery after `processing`).

## Order creation (required pattern)

All channels and future jobs must create orders through:

```ts
import { createOrder, createOrderInTransaction } from "@/modules/orders";
```

- `createOrder(command)` — manages its own transaction + idempotency replay
- `createOrderInTransaction(tx, command)` — compose inside an outer transaction (checkout does this)

`CreateOrderCommand` always includes explicit fields:

- `tenantId`, `customerId`, `channel`
- `subtotalMinor`, `discountMinor`, `deliveryFeeMinor`, `totalMinor`
- line items with name/price snapshots

Never accept a single client-supplied total as the source of truth. Totals are validated:  
`totalMinor === subtotalMinor - discountMinor + deliveryFeeMinor`.

### Adapters (today and later)

| Caller | Responsibility |
|--------|------------------|
| `placeGuestOrder` (web) | Load cart, upsert guest customer, set `channel: "web"`, convert cart after create |
| Telegram / WhatsApp (future) | Resolve identity → customer, build command with `channel: "telegram"` / etc. Channel payloads stay in `src/channels/*`, not on `Order` |
| Recurring / subscription runner (future) | Build the same `CreateOrderCommand` from a saved template or prior order; call `createOrder` — no cart required |

## Money model

Stored separately on every order:

- `subtotalMinor`
- `discountMinor` (0 today; promotions will write here later)
- `deliveryFeeMinor`
- `totalMinor`

Do not collapse these into one field.

## Attribution (placeholders only)

Optional nullable columns — **no business logic yet**:

- `promotionId`
- `referralCode`
- `campaignId`

Checkout does not set them today. Future promotion/referral modules may populate them when building `CreateOrderCommand`. Do not add empty loyalty/referral/subscription modules for appearance.

## Status transitions

After creation (`pending` + first `OrderStatusHistory` row), **all** status changes go through:

```ts
import { transitionOrderStatus } from "@/modules/orders";
```

Allowed transitions live in `ALLOWED_ORDER_STATUS_TRANSITIONS`.  
Side effects (loyalty accrual, notifications, webhooks) attach in `afterOrderStatusTransition` inside `order-status-service.ts`.

**Loyalty:** award from completed (or other policy) transitions — **not** inside checkout.

## Channel-specific data

Keep Telegram chat IDs, WhatsApp WA IDs, message metadata, Mini App session state outside the core `Order` model (e.g. `CustomerIdentity.meta`, channel modules). `Order.channel` is only the originating channel enum (`web` | `telegram` | `manual`, …).

## Out of scope (do not stub)

- Loyalty ledger / points calculation
- Referral graph
- Subscription billing schedules
- Payment gateway webhooks
- Promotion engine

Wire those when product-ready by calling `createOrder` and `transitionOrderStatus`, not by forking order insert logic.

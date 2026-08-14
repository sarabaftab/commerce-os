# Customer account (profile, addresses, orders)

Authenticated customers (Telegram Mini App or browser session) manage profile, saved addresses, and order history under `/{tenantSlug}/account`.

Guest checkout remains available without an account.

## Routes

- `/{tenantSlug}/account`
- `/{tenantSlug}/account/profile`
- `/{tenantSlug}/account/addresses`
- `/{tenantSlug}/account/orders`
- `/{tenantSlug}/account/orders/[orderNumber]`

Unauthenticated visitors are redirected to the storefront.

## Security

- Customer id and tenant id come only from the CommerceOS customer session + URL tenant slug
- Address and order queries always filter by both
- Cross-customer order access returns a generic not-found
- Order timeline omits admin notes and staff ids
- Historical delivery data uses order snapshots, not live `CustomerAddress` rows

## Checkout

Authenticated customers can:

- Prefill contact from profile
- Select a saved active address (server loads values; client id is ownership-checked)
- Enter a one-time address and optionally save / set default

Guests keep the previous one-time address form.

## Manual checklist

- [ ] Telegram iOS / Android / Desktop — Account nav, BackButton, light/dark
- [ ] Mobile + desktop browser storefront
- [ ] First-time profile + first address becomes default
- [ ] Multiple addresses, change default, delete default (replacement assigned)
- [ ] Delivery checkout with saved address; pickup without address
- [ ] Guest checkout still works
- [ ] New order appears in My Orders; detail + timeline readable
- [ ] Another customer’s order number → not found
- [ ] Session expired → account redirects to store
- [ ] COD + ABA still place orders; channel stays telegram/web

# Tenant Settings

Per-tenant operational configuration for storefront, checkout, and payments.

## Defaults (migration / first row)

| Setting | Default |
|---------|---------|
| `deliveryEnabled` / `pickupEnabled` | `true` |
| `deliveryFeeMinor` | `0` |
| `freeDeliveryThresholdMinor` | `null` (no free delivery) |
| `codEnabled` / `abaEnabled` | `true` |
| `timezone` | `Asia/Phnom_Penh` |
| Currency | existing `tenants.currency` |

Legacy `tenants.config.checkout` is migrated once; runtime reads typed `tenant_settings` + `pickup_locations` only via this module.

## Consumers

Storefront, checkout, and orders must call `TenantSettingsService` helpers — never query settings tables directly.

Place-order uses `assertCheckoutOptions` / `getCheckoutSettings({ fresh: true })` so cache cannot authorize stale rules.

## Extension

Future loyalty / referral / channel settings belong in separate modules or namespaces — not empty tables here.

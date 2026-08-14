type SafeLogEvent =
  | "customer.profile_updated"
  | "customer.address_created"
  | "customer.address_updated"
  | "customer.address_default_changed"
  | "customer.address_deactivated"
  | "customer.orders_listed"
  | "customer.order_access_denied";

export function logCustomerEvent(
  event: SafeLogEvent,
  fields: {
    tenantId: string;
    customerId: string;
    addressId?: string;
    orderNumber?: string;
  },
) {
  console.info(
    JSON.stringify({
      event,
      tenantId: fields.tenantId,
      customerId: fields.customerId,
      ...(fields.addressId ? { addressId: fields.addressId } : {}),
      ...(fields.orderNumber ? { orderNumber: fields.orderNumber } : {}),
      at: new Date().toISOString(),
    }),
  );
}

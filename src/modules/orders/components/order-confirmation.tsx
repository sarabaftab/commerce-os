import type { OrderConfirmation } from "@/modules/orders";
import { formatMoney } from "@/shared/money/money";

type OrderConfirmationViewProps = {
  order: OrderConfirmation;
};

function formatPaymentMethod(method: OrderConfirmation["paymentMethod"]) {
  return method === "cod" ? "Cash on Delivery" : "ABA Transfer";
}

function formatFulfillment(order: OrderConfirmation) {
  if (order.fulfillmentMethod === "pickup") {
    return [order.pickupLocationName, order.pickupLocationAddress]
      .filter(Boolean)
      .join(" — ") || "Pickup";
  }
  const parts = [order.addressLine, order.cityOrArea].filter(Boolean);
  return parts.join(", ");
}

function formatStatus(status: OrderConfirmation["status"]) {
  return status.replaceAll("_", " ");
}

export function OrderConfirmationView({ order }: OrderConfirmationViewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-[color:var(--shop-line)]">
        <p className="text-xs font-medium tracking-[0.14em] text-[color:var(--shop-accent)] uppercase">
          Order confirmed
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {order.orderNumber}
        </h1>
        <p className="mt-2 text-sm capitalize text-[color:var(--shop-ink-muted)]">
          Status: {formatStatus(order.status)}
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-white/80 p-4 ring-1 ring-[color:var(--shop-line)]">
        <section>
          <h2 className="text-sm font-semibold">Customer</h2>
          <p className="mt-2 text-sm">{order.customer.displayName}</p>
          {order.customer.phone ? (
            <p className="text-sm text-[color:var(--shop-ink-muted)]">{order.customer.phone}</p>
          ) : null}
          {order.customer.email ? (
            <p className="text-sm text-[color:var(--shop-ink-muted)]">{order.customer.email}</p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold">Fulfillment</h2>
          <p className="mt-2 text-sm capitalize">{order.fulfillmentMethod}</p>
          <p className="text-sm text-[color:var(--shop-ink-muted)]">{formatFulfillment(order)}</p>
          {order.deliveryInstructions ? (
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {order.deliveryInstructions}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold">Payment</h2>
          <p className="mt-2 text-sm">{formatPaymentMethod(order.paymentMethod)}</p>
          {order.paymentReference ? (
            <p className="text-sm text-[color:var(--shop-ink-muted)]">
              Reference: {order.paymentReference}
            </p>
          ) : null}
        </section>
      </div>

      <div className="space-y-4 rounded-2xl bg-white/80 p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">Items</h2>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-[color:var(--shop-ink-muted)]">
                  {formatMoney(item.unitPriceMinor, order.currency)} × {item.quantity}
                </p>
              </div>
              <span className="font-medium">
                {formatMoney(item.lineTotalMinor, order.currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-[color:var(--shop-line)] pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[color:var(--shop-ink-muted)]">Subtotal</span>
            <span>{formatMoney(order.subtotalMinor, order.currency)}</span>
          </div>
          {order.deliveryFeeMinor > 0 ? (
            <div className="flex justify-between">
              <span className="text-[color:var(--shop-ink-muted)]">Delivery</span>
              <span>{formatMoney(order.deliveryFeeMinor, order.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatMoney(order.totalMinor, order.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import type {
  Cart,
  CartItem,
  CartStatus,
  FulfillmentMethod,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  PaymentMethod,
} from "@prisma/client";

export type {
  Cart,
  CartItem,
  CartStatus,
  FulfillmentMethod,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  PaymentMethod,
};

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const satisfies readonly OrderStatus[];

export type CartLineView = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  currency: string;
  imageUrl: string | null;
  isAvailable: boolean;
};

export type CartSummary = {
  id: string;
  itemCount: number;
  currency: string;
  subtotalMinor: number;
  items: CartLineView[];
};

export type CartWithItems = Cart & {
  items: (CartItem & {
    product: {
      id: string;
      slug: string;
      name: string;
      priceMinor: number;
      currency: string;
      isAvailable: boolean;
      deletedAt: Date | null;
      media: { url: string; alt: string | null }[];
    };
  })[];
};

export const MAX_CART_QUANTITY = 99;

export type OrderLineView = {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type OrderConfirmation = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  fulfillmentMethod: FulfillmentMethod;
  addressLine: string | null;
  cityOrArea: string | null;
  deliveryInstructions: string | null;
  pickupLocationKey: string | null;
  pickupLocationName: string | null;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  placedAt: Date;
  customer: {
    displayName: string | null;
    phone: string | null;
    email: string | null;
  };
  items: OrderLineView[];
};

export type CheckoutPreview = {
  cart: CartSummary;
  idempotencyKey: string;
  deliveryFeeMinor: number;
  abaInstructions: string;
  pickupLocations: { id: string; name: string; address: string }[];
};

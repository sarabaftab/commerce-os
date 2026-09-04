import type {
  Cart,
  CartItem,
  CartStatus,
  FulfillmentMethod,
  IdentityChannel,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  PaymentMethod,
  SellingUnit,
} from "@prisma/client";

export type {
  Cart,
  CartItem,
  CartStatus,
  FulfillmentMethod,
  IdentityChannel,
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
  volume: string | null;
  sellingUnit: SellingUnit;
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
      volume: string | null;
      sellingUnit: SellingUnit;
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
  volume: string | null;
  sellingUnit: SellingUnit;
};

export type OrderConfirmation = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel: IdentityChannel;
  currency: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  promotionId: string | null;
  referralCode: string | null;
  campaignId: string | null;
  fulfillmentMethod: FulfillmentMethod;
  addressLine: string | null;
  cityOrArea: string | null;
  deliveryInstructions: string | null;
  pickupLocationKey: string | null;
  pickupLocationName: string | null;
  pickupLocationAddress: string | null;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  paymentProofStatus: import("@prisma/client").PaymentProofStatus;
  paymentProofRejectionReason: string | null;
  placedAt: Date;
  /** Present on create/replay for cookie handoff — never required from clients. */
  confirmationToken?: string;
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
  currency: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFeeMinor: number;
  freeDeliveryThresholdMinor: number | null;
  deliveryNotes: string | null;
  pickupLocations: { id: string; name: string; address: string; instructions: string | null }[];
  codEnabled: boolean;
  abaAvailable: boolean;
  abaInstructions: string | null;
  abaAccountName: string | null;
  abaAccountNumber: string | null;
  abaQrImageUrl: string | null;
  abaCustomerNote: string | null;
  checkoutBlockedReason: string | null;
  prefillDisplayName?: string | null;
  prefillFirstName?: string | null;
  prefillLastName?: string | null;
  prefillPhone?: string | null;
  prefillEmail?: string | null;
  savedAddresses?: {
    id: string;
    label: string;
    recipientFirstName: string;
    recipientLastName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    cityOrDistrict: string;
    provinceOrState: string;
    postalCode: string | null;
    countryCode: string;
    deliveryInstructions: string | null;
    isDefault: boolean;
    formattedShort: string;
  }[];
  defaultAddressId?: string | null;
  isAuthenticated?: boolean;
};

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  fulfillmentMethod: FulfillmentMethod;
  totalMinor: number;
  currency: string;
  placedAt: Date;
  customerType: import("./customer-type").OrderCustomerType;
  customer: {
    id: string;
    displayName: string | null;
    phone: string | null;
  };
};

export type AdminOrderListResult = {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type OrderStatusHistoryEntry = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
  actorLabel: string;
};

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel: IdentityChannel;
  currency: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  notes: string | null;
  fulfillmentMethod: FulfillmentMethod;
  addressLine: string | null;
  cityOrArea: string | null;
  deliveryInstructions: string | null;
  pickupLocationKey: string | null;
  pickupLocationName: string | null;
  pickupLocationAddress: string | null;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  paymentProofStatus: import("@prisma/client").PaymentProofStatus;
  paymentProofRejectionReason: string | null;
  placedAt: Date;
  customerType: import("./customer-type").OrderCustomerType;
  customer: {
    id: string;
    displayName: string | null;
    phone: string | null;
    email: string | null;
  };
  items: OrderLineView[];
  statusHistory: OrderStatusHistoryEntry[];
  allowedNextStatuses: OrderStatus[];
  telegramLinked: boolean;
  notifications: {
    id: string;
    toStatus: OrderStatus;
    status: import("@prisma/client").NotificationDeliveryStatus;
    errorCode: string | null;
  }[];
};

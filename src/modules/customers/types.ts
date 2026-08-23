export type CustomerProfileDto = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
};

export type CustomerAddressDto = {
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
  isActive: boolean;
  formattedShort: string;
};

export type CustomerOrderListFilter = "all" | "active" | "completed" | "cancelled";

export type CustomerOrderListItemDto = {
  orderNumber: string;
  placedAt: Date;
  status: string;
  statusLabel: string;
  fulfillmentMethod: string;
  paymentMethod: string;
  itemCount: number;
  totalMinor: number;
  currency: string;
  itemSummary: string;
  thumbnailUrl: string | null;
};

export type CustomerOrderListResult = {
  items: CustomerOrderListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CustomerOrderTimelineEntryDto = {
  status: string;
  statusLabel: string;
  createdAt: Date;
};

export type CustomerOrderDetailDto = {
  orderNumber: string;
  placedAt: Date;
  status: string;
  statusLabel: string;
  channel: string;
  fulfillmentMethod: string;
  paymentMethod: string;
  paymentReference: string | null;
  currency: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  delivery: {
    recipientName: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    cityOrArea: string | null;
    provinceOrState: string | null;
    postalCode: string | null;
    countryCode: string | null;
    label: string | null;
    deliveryInstructions: string | null;
  } | null;
  pickup: {
    name: string | null;
    address: string | null;
  } | null;
  items: {
    name: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    imageUrl: string | null;
    volume: string | null;
    sellingUnit: import("@prisma/client").SellingUnit;
  }[];
  timeline: CustomerOrderTimelineEntryDto[];
  supportPhone: string | null;
  supportEmail: string | null;
};

export const CUSTOMER_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function customerOrderStatusLabel(status: string): string {
  return CUSTOMER_ORDER_STATUS_LABELS[status] ?? status;
}

export function formatAddressShort(input: {
  addressLine1: string;
  cityOrDistrict: string;
  provinceOrState: string;
}): string {
  return [input.addressLine1, input.cityOrDistrict, input.provinceOrState]
    .filter(Boolean)
    .join(", ");
}

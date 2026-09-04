import {
  orderCustomerTypeLabel,
  type CustomerLifecycleLabel,
  type OrderCustomerType,
} from "@/modules/orders/customer-type";
import { Badge } from "@/ui/components/ui/badge";
import { cn } from "@/ui/lib/utils";

type CustomerTypeBadgeProps = {
  type: OrderCustomerType;
  className?: string;
};

export function CustomerTypeBadge({ type, className }: CustomerTypeBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full font-medium",
        type === "new"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-sky-50 text-sky-800",
        className,
      )}
    >
      {orderCustomerTypeLabel(type)}
    </Badge>
  );
}

type CustomerLifecycleBadgeProps = {
  lifecycle: CustomerLifecycleLabel;
  className?: string;
};

export function CustomerLifecycleBadge({
  lifecycle,
  className,
}: CustomerLifecycleBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full font-medium",
        lifecycle === "New"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-sky-50 text-sky-800",
        className,
      )}
    >
      {lifecycle}
    </Badge>
  );
}

import type { ReactNode } from "react";

import { cn } from "@/ui/lib/utils";

type FieldLabelProps = {
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Storefront / plain-label required marker.
 * Prefer pairing with native `required` or `aria-required` on the control.
 */
export function FieldLabel({ htmlFor, required, className, children }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1 block text-xs font-medium", className)}>
      {children}
      {required ? (
        <>
          <span className="text-red-600" aria-hidden="true">
            {" "}
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      ) : null}
    </label>
  );
}

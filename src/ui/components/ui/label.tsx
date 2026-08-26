"use client"

import * as React from "react"

import { cn } from "@/ui/lib/utils"

type LabelProps = React.ComponentProps<"label"> & {
  /** Visual required marker (red *). Pair with input `required` / `aria-required`. */
  required?: boolean;
};

function Label({ className, children, required, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span>
        {children}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </span>
      {required ? <span className="sr-only">(required)</span> : null}
    </label>
  )
}

export { Label }
export type { LabelProps }

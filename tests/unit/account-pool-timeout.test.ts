import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

import { AccountLoadError } from "@/modules/customers/components/account-load-error";
import { isPrismaPoolTimeout } from "@/shared/db/prisma-errors";

describe("Account pool-timeout resilience", () => {
  it("detects Prisma P2024 connection pool timeouts", () => {
    const error = new Prisma.PrismaClientKnownRequestError("pool timeout", {
      code: "P2024",
      clientVersion: "6.19.3",
    });
    expect(isPrismaPoolTimeout(error)).toBe(true);
    expect(isPrismaPoolTimeout(new Error("other"))).toBe(false);
  });

  it("renders a soft Account recovery UI instead of crashing", () => {
    const html = renderToStaticMarkup(
      createElement(AccountLoadError, { tenantSlug: "kin-a2" }),
    );
    expect(html).toContain("Account is busy");
    expect(html).toContain("/kin-a2/account");
    expect(html).toContain("Try again");
  });
});

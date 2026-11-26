import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMany, groupBy } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    customer: { updateMany, groupBy },
  },
}));

import {
  customerSourceKindLabel,
  customerSourceLabel,
  parseTelegramStartParam,
} from "@/modules/customers/source";
import {
  recordFirstTouchCustomerSource,
  summarizeCustomerSources,
} from "@/modules/customers/services/customer-source-service";

describe("parseTelegramStartParam", () => {
  it("treats a signed campaign token as a Telegram source", () => {
    expect(parseTelegramStartParam("summer_sale")).toEqual({
      kind: "telegram_campaign",
      key: "summer_sale",
    });
  });

  it("recognizes referral and marketing prefixes", () => {
    expect(parseTelegramStartParam("ref_ada")).toEqual({ kind: "referral", key: "ada" });
    expect(parseTelegramStartParam("referral_shop")).toEqual({
      kind: "referral",
      key: "shop",
    });
    expect(parseTelegramStartParam("mkt_instagram")).toEqual({
      kind: "marketing",
      key: "instagram",
    });
    expect(parseTelegramStartParam("src_flyer")).toEqual({
      kind: "marketing",
      key: "flyer",
    });
  });

  it("returns null for missing, empty, or malformed params", () => {
    expect(parseTelegramStartParam(undefined)).toBeNull();
    expect(parseTelegramStartParam(null)).toBeNull();
    expect(parseTelegramStartParam("")).toBeNull();
    expect(parseTelegramStartParam("   ")).toBeNull();
    expect(parseTelegramStartParam("has space")).toBeNull();
    expect(parseTelegramStartParam("ref_")).toBeNull();
    expect(parseTelegramStartParam("bad/param")).toBeNull();
    expect(parseTelegramStartParam("a".repeat(65))).toBeNull();
    expect(parseTelegramStartParam("https://evil.example")).toBeNull();
  });
});

describe("customer source labels", () => {
  it("shows Unknown when nothing was recorded", () => {
    expect(customerSourceLabel(null, null)).toBe("Unknown");
    expect(customerSourceLabel(undefined, undefined)).toBe("Unknown");
    expect(customerSourceKindLabel(null)).toBe("Unknown");
  });

  it("labels known kinds without guessing unrecognized values", () => {
    expect(customerSourceLabel("telegram_campaign", "summer_sale")).toBe(
      "Telegram · summer_sale",
    );
    expect(customerSourceLabel("not_a_kind", "x")).toBe("Unknown");
  });
});

describe("recordFirstTouchCustomerSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("writes the first campaign source for the authenticated tenant only", async () => {
    const wrote = await recordFirstTouchCustomerSource({
      tenantId: "tenant-a",
      customerId: "cust-1",
      startParam: "summer_sale",
    });

    expect(wrote).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "cust-1",
        tenantId: "tenant-a",
        deletedAt: null,
        sourceKey: null,
      },
      data: expect.objectContaining({
        sourceKind: "telegram_campaign",
        sourceKey: "summer_sale",
      }),
    });
  });

  it("does not write when the launch has no attribution", async () => {
    const wrote = await recordFirstTouchCustomerSource({
      tenantId: "tenant-a",
      customerId: "cust-1",
      startParam: undefined,
    });
    expect(wrote).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not write an invalid param, so a known source cannot become Unknown", async () => {
    const wrote = await recordFirstTouchCustomerSource({
      tenantId: "tenant-a",
      customerId: "cust-1",
      startParam: "not a source",
    });
    expect(wrote).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing source because the update requires a null key", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    const wrote = await recordFirstTouchCustomerSource({
      tenantId: "tenant-a",
      customerId: "cust-1",
      startParam: "ref_later",
    });
    expect(wrote).toBe(false);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sourceKey: null, tenantId: "tenant-a" }),
        data: expect.objectContaining({ sourceKind: "referral", sourceKey: "later" }),
      }),
    );
  });
});

describe("summarizeCustomerSources", () => {
  it("aggregates only the requested tenant", async () => {
    groupBy.mockResolvedValue([
      { sourceKind: null, _count: { _all: 4 } },
      { sourceKind: "telegram_campaign", _count: { _all: 2 } },
    ]);

    const summary = await summarizeCustomerSources("tenant-a");

    expect(groupBy).toHaveBeenCalledWith({
      by: ["sourceKind"],
      where: { tenantId: "tenant-a", deletedAt: null },
      _count: { _all: true },
    });
    expect(summary.map((row) => `${row.label}:${row.count}`)).toEqual([
      "Unknown:4",
      "Telegram:2",
    ]);
  });
});

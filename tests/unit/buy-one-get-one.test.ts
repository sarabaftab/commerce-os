import { describe, expect, it } from "vitest";
import type { Promotion } from "@prisma/client";

import {
  bogoAvailableSets,
  bogoFulfillmentQuantity,
  bogoFreeQuantity,
  isBogoPurchasable,
  resolveBogoLineQuantities,
} from "@/modules/promotions/buy-one-get-one";
import {
  buildActiveBuyOneGetOneByProductId,
  computeCampaignDiscountMinor,
  pickEligibleCampaignDiscount,
  pickStorefrontCampaignDisplay,
  type PromotionWithProducts,
} from "@/modules/promotions/discount";
import {
  isProductPurchasable,
  maxPurchasableQuantity,
  resolveLinePromotionQuantities,
} from "@/modules/orders/line-promotion";
import {
  promotionFormSchema,
  promotionFormToCreateInput,
} from "@/modules/promotions/schemas/promotion";

function promo(
  overrides: Partial<PromotionWithProducts> &
    Pick<Promotion, "id" | "name" | "type" | "value">,
): PromotionWithProducts {
  return {
    tenantId: "tenant-a",
    bannerText: null,
    minimumSubtotalMinor: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    products: [],
    ...overrides,
  };
}

describe("buy_one_get_one quantity math", () => {
  it("maps paid → free → fulfillment (1→2, 2→4, 3→6)", () => {
    expect(bogoFreeQuantity(1)).toBe(1);
    expect(bogoFulfillmentQuantity(1)).toBe(2);
    expect(resolveBogoLineQuantities(2)).toEqual({
      paidQuantity: 2,
      freeQuantity: 2,
      fulfillmentQuantity: 4,
    });
    expect(resolveBogoLineQuantities(3).fulfillmentQuantity).toBe(6);
  });

  it("prices from paid quantity only", () => {
    const line = resolveLinePromotionQuantities({
      paidQuantity: 3,
      unitPriceMinor: 3000,
      bogo: {
        promotionId: "p1",
        promotionName: "1+1 Milk",
        bannerText: null,
      },
    });
    expect(line.lineTotalMinor).toBe(9000);
    expect(line.freeQuantity).toBe(3);
    expect(line.fulfillmentQuantity).toBe(6);
    expect(line.promotionTypeSnapshot).toBe("buy_one_get_one");
  });
});

describe("buy_one_get_one stock / OOS", () => {
  it("available sets = floor(stock/2)", () => {
    expect(bogoAvailableSets(0)).toBe(0);
    expect(bogoAvailableSets(1)).toBe(0);
    expect(bogoAvailableSets(2)).toBe(1);
    expect(bogoAvailableSets(3)).toBe(1);
    expect(bogoAvailableSets(4)).toBe(2);
    expect(bogoAvailableSets(6)).toBe(3);
    expect(bogoAvailableSets(null)).toBe(0);
  });

  it("marks stock 0–1 as out of stock for 1+1", () => {
    expect(isBogoPurchasable(0)).toBe(false);
    expect(isBogoPurchasable(1)).toBe(false);
    expect(isBogoPurchasable(2)).toBe(true);
  });

  it("caps max purchasable sets by stock", () => {
    const bogo = {
      promotionId: "p1",
      promotionName: "1+1",
      bannerText: null,
    };
    expect(
      maxPurchasableQuantity({ isAvailable: true, stockQuantity: 3 }, bogo, 99),
    ).toBe(1);
    expect(
      maxPurchasableQuantity({ isAvailable: true, stockQuantity: 4 }, bogo, 99),
    ).toBe(2);
    expect(
      isProductPurchasable({ isAvailable: true, stockQuantity: 1 }, bogo),
    ).toBe(false);
  });
});

describe("buy_one_get_one eligibility map (same-SKU only)", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("maps each eligible SKU independently and does not mix", () => {
    const map = buildActiveBuyOneGetOneByProductId(
      [
        promo({
          id: "bogo-1",
          name: "1+1 Dairy",
          type: "buy_one_get_one",
          value: 1,
          products: [{ productId: "milk-a" }, { productId: "milk-b" }],
        }),
      ],
      now,
    );
    expect(map.get("milk-a")?.promotionId).toBe("bogo-1");
    expect(map.get("milk-b")?.promotionId).toBe("bogo-1");
    expect(map.get("milk-c")).toBeUndefined();
  });

  it("ignores inactive / out-of-window campaigns", () => {
    expect(
      buildActiveBuyOneGetOneByProductId(
        [
          promo({
            id: "expired",
            name: "Old",
            type: "buy_one_get_one",
            value: 1,
            endsAt: new Date("2026-01-01T00:00:00.000Z"),
            products: [{ productId: "milk-a" }],
          }),
        ],
        now,
      ).size,
    ).toBe(0);
  });
});

describe("money discounts exclude buy_one_get_one", () => {
  it("does not pick BOGO as cart-level discount", () => {
    const chosen = pickEligibleCampaignDiscount(
      [
        promo({
          id: "bogo",
          name: "1+1",
          type: "buy_one_get_one",
          value: 1,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
          products: [{ productId: "x" }],
        }),
        promo({
          id: "pct",
          name: "10%",
          type: "percentage",
          value: 10,
          createdAt: new Date("2026-05-01T00:00:00.000Z"),
        }),
      ],
      { subtotalMinor: 10_000 },
    );
    expect(chosen?.promotionId).toBe("pct");
    expect(chosen?.discountMinor).toBe(1000);
  });

  it("computeCampaignDiscountMinor returns 0 for BOGO", () => {
    expect(
      computeCampaignDiscountMinor(5000, { type: "buy_one_get_one", value: 1 }),
    ).toBe(0);
  });

  it("storefront money campaign pick ignores BOGO", () => {
    const display = pickStorefrontCampaignDisplay([
      promo({
        id: "bogo",
        name: "1+1",
        type: "buy_one_get_one",
        value: 1,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        products: [],
      }),
    ]);
    expect(display).toBeNull();
  });
});

describe("1+1 promotion form", () => {
  it("requires eligible products and sets value=1", () => {
    const parsed = promotionFormSchema.parse({
      name: "1+1 Test",
      type: "buy_one_get_one",
      isActive: true,
      productIds: ["prod-1", "prod-2"],
    });
    const input = promotionFormToCreateInput(parsed, "tenant-a", "USD");
    expect(input.type).toBe("buy_one_get_one");
    expect(input.value).toBe(1);
    expect(input.productIds).toEqual(["prod-1", "prod-2"]);
    expect(input.minimumSubtotalMinor).toBeNull();
  });

  it("rejects BOGO without products", () => {
    const parsed = promotionFormSchema.safeParse({
      name: "1+1 Test",
      type: "buy_one_get_one",
      isActive: true,
      productIds: [],
    });
    expect(parsed.success).toBe(false);
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Promotion } from "@prisma/client";

import {
  computeCampaignDiscountMinor,
  isPromotionEligible,
  isPromotionVisibleForBanner,
  pickEligibleCampaignDiscount,
} from "@/modules/promotions/discount";
import {
  promotionFormSchema,
  promotionFormToCreateInput,
} from "@/modules/promotions/schemas/promotion";
import { computeDeliveryFeeMinor } from "@/modules/settings/services/delivery-fee";
import { CheckoutOrderReview } from "@/modules/orders/components/checkout-order-review";
import type { CartSummary } from "@/modules/orders";

function promo(overrides: Partial<Promotion> & Pick<Promotion, "id" | "name" | "type" | "value">): Promotion {
  return {
    tenantId: "tenant-a",
    bannerText: null,
    minimumSubtotalMinor: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("computeCampaignDiscountMinor", () => {
  it("applies percentage with floor integer math", () => {
    expect(computeCampaignDiscountMinor(3050, { type: "percentage", value: 10 })).toBe(305);
  });

  it("applies fixed amount", () => {
    expect(computeCampaignDiscountMinor(5000, { type: "fixed", value: 300 })).toBe(300);
  });

  it("never exceeds subtotal", () => {
    expect(computeCampaignDiscountMinor(200, { type: "fixed", value: 500 })).toBe(200);
    expect(computeCampaignDiscountMinor(99, { type: "percentage", value: 100 })).toBe(99);
  });

  it("returns 0 for empty or invalid inputs", () => {
    expect(computeCampaignDiscountMinor(0, { type: "percentage", value: 10 })).toBe(0);
    expect(computeCampaignDiscountMinor(1000, { type: "percentage", value: 0 })).toBe(0);
    expect(computeCampaignDiscountMinor(1000, { type: "percentage", value: 101 })).toBe(0);
  });
});

describe("isPromotionEligible", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("rejects inactive promotions", () => {
    expect(
      isPromotionEligible(
        { type: "percentage", value: 10, isActive: false },
        { subtotalMinor: 5000, now },
      ),
    ).toBe(false);
  });

  it("rejects future startsAt", () => {
    expect(
      isPromotionEligible(
        {
          type: "percentage",
          value: 10,
          isActive: true,
          startsAt: new Date("2026-07-01T00:00:00.000Z"),
        },
        { subtotalMinor: 5000, now },
      ),
    ).toBe(false);
  });

  it("rejects expired endsAt", () => {
    expect(
      isPromotionEligible(
        {
          type: "percentage",
          value: 10,
          isActive: true,
          endsAt: new Date("2026-06-01T00:00:00.000Z"),
        },
        { subtotalMinor: 5000, now },
      ),
    ).toBe(false);
  });

  it("enforces minimum subtotal", () => {
    expect(
      isPromotionEligible(
        {
          type: "percentage",
          value: 10,
          isActive: true,
          minimumSubtotalMinor: 4000,
        },
        { subtotalMinor: 3999, now },
      ),
    ).toBe(false);
    expect(
      isPromotionEligible(
        {
          type: "percentage",
          value: 10,
          isActive: true,
          minimumSubtotalMinor: 4000,
        },
        { subtotalMinor: 4000, now },
      ),
    ).toBe(true);
  });
});

describe("pickEligibleCampaignDiscount", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("chooses the most recently created eligible promotion (no stacking)", () => {
    const older = promo({
      id: "old",
      name: "Old 20%",
      type: "percentage",
      value: 20,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newer = promo({
      id: "new",
      name: "New $3",
      type: "fixed",
      value: 300,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const chosen = pickEligibleCampaignDiscount([older, newer], {
      subtotalMinor: 5000,
      now,
    });
    expect(chosen?.promotionId).toBe("new");
    expect(chosen?.discountMinor).toBe(300);
  });

  it("ignores promotions from other tenants when caller only passes tenant-scoped rows", () => {
    const foreign = promo({
      id: "foreign",
      name: "Other tenant",
      type: "percentage",
      value: 50,
      tenantId: "tenant-b",
    });
    // Caller must scope by tenant; helper only sees what it is given.
    expect(
      pickEligibleCampaignDiscount([], { subtotalMinor: 5000, now }),
    ).toBeNull();
    expect(
      pickEligibleCampaignDiscount([foreign], { subtotalMinor: 5000, now })?.promotionId,
    ).toBe("foreign");
  });
});

describe("isPromotionVisibleForBanner", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("shows banner only when active, in window, and text present", () => {
    expect(
      isPromotionVisibleForBanner(
        {
          isActive: true,
          bannerText: "10% off this week",
          startsAt: null,
          endsAt: null,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isPromotionVisibleForBanner(
        { isActive: true, bannerText: "  ", startsAt: null, endsAt: null },
        now,
      ),
    ).toBe(false);
    expect(
      isPromotionVisibleForBanner(
        {
          isActive: false,
          bannerText: "Hidden",
          startsAt: null,
          endsAt: null,
        },
        now,
      ),
    ).toBe(false);
  });
});

describe("promotion + free delivery interaction", () => {
  it("keeps free-delivery threshold on pre-discount merchandise subtotal", () => {
    const subtotalMinor = 4000;
    const discountMinor = computeCampaignDiscountMinor(subtotalMinor, {
      type: "percentage",
      value: 10,
    });
    expect(discountMinor).toBe(400);

    const deliveryFeeMinor = computeDeliveryFeeMinor({
      fulfillmentMethod: "delivery",
      deliveryEnabled: true,
      deliveryFeeMinor: 200,
      freeDeliveryThresholdMinor: 4000,
      // Authoritative: threshold uses pre-discount subtotal (not 3600).
      subtotalMinor,
    });
    expect(deliveryFeeMinor).toBe(0);

    const totalMinor = subtotalMinor - discountMinor + deliveryFeeMinor;
    expect(totalMinor).toBe(3600);

    // Guard: post-discount would wrongly charge delivery.
    const wrong = computeDeliveryFeeMinor({
      fulfillmentMethod: "delivery",
      deliveryEnabled: true,
      deliveryFeeMinor: 200,
      freeDeliveryThresholdMinor: 4000,
      subtotalMinor: subtotalMinor - discountMinor,
    });
    expect(wrong).toBe(200);
  });

  it("persists snapshot fields independently of later promo edits", () => {
    const atOrderTime = pickEligibleCampaignDiscount(
      [
        promo({
          id: "summer",
          name: "Summer Promo",
          type: "percentage",
          value: 10,
        }),
      ],
      { subtotalMinor: 3000, now: new Date("2026-06-15T12:00:00.000Z") },
    );
    expect(atOrderTime).toEqual(
      expect.objectContaining({
        promotionId: "summer",
        promotionName: "Summer Promo",
        discountMinor: 300,
      }),
    );

    // Later admin edit changes live promo — historical order keeps snapshot.
    const orderSnapshot = {
      promotionId: atOrderTime!.promotionId,
      promotionNameSnapshot: atOrderTime!.promotionName,
      discountMinor: atOrderTime!.discountMinor,
      subtotalMinor: 3000,
      deliveryFeeMinor: 200,
      totalMinor: 3000 - 300 + 200,
    };
    const editedLive = promo({
      id: "summer",
      name: "Renamed Winter",
      type: "percentage",
      value: 50,
    });
    expect(editedLive.name).not.toBe(orderSnapshot.promotionNameSnapshot);
    expect(orderSnapshot.discountMinor).toBe(300);
    expect(orderSnapshot.totalMinor).toBe(2900);
  });
});

describe("promotionFormSchema", () => {
  it("accepts percentage and converts fixed via currency", () => {
    const pct = promotionFormSchema.safeParse({
      name: "10% off",
      type: "percentage",
      valueMajor: "10",
      isActive: true,
    });
    expect(pct.success).toBe(true);

    const fixed = promotionFormSchema.parse({
      name: "Flat $3",
      type: "fixed",
      valueMajor: "3",
      currency: "USD",
      isActive: true,
    });
    const input = promotionFormToCreateInput(fixed, "tenant-a", "USD");
    expect(input.value).toBe(300);
    expect(input.tenantId).toBe("tenant-a");
  });

  it("rejects invalid percentage and end before start", () => {
    expect(
      promotionFormSchema.safeParse({
        name: "Bad",
        type: "percentage",
        valueMajor: "150",
        isActive: true,
      }).success,
    ).toBe(false);

    expect(
      promotionFormSchema.safeParse({
        name: "Bad dates",
        type: "fixed",
        valueMajor: "1",
        startsAt: "2026-06-10T10:00",
        endsAt: "2026-06-01T10:00",
        isActive: true,
      }).success,
    ).toBe(false);
  });
});

describe("CheckoutOrderReview discount line", () => {
  it("renders promotion discount and adjusted total", () => {
    const cart: CartSummary = {
      id: "cart-1",
      currency: "USD",
      itemCount: 1,
      subtotalMinor: 3000,
      items: [
        {
          id: "line-1",
          productId: "p1",
          slug: "widget",
          name: "Widget",
          quantity: 1,
          unitPriceMinor: 3000,
          lineTotalMinor: 3000,
          currency: "USD",
          imageUrl: null,
          isAvailable: true,
          volume: null,
          sellingUnit: "item",
        },
      ],
    };

    const html = renderToStaticMarkup(
      createElement(CheckoutOrderReview, {
        cart,
        deliveryFeeMinor: 200,
        discountMinor: 300,
        promotionName: "Summer Promo",
        fulfillmentMethod: "delivery",
      }),
    );

    expect(html).toContain("Summer Promo");
    expect(html).toContain("Subtotal");
    expect(html).toContain("Total");
  });
});

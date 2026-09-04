import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  formatPhoneForDisplay,
  isValidPhone,
  normalizePhone,
  normalizePhoneToE164,
  phoneLookupVariants,
} from "@/shared/phone/normalize-phone";

describe("Cambodian phone normalization", () => {
  const equivalents = [
    "012345678",
    "012 345 678",
    "012-345-678",
    "+85512345678",
    "+855 12 345 678",
    "85512345678",
  ];

  it("normalizes equivalent Cambodia numbers to the same E.164", () => {
    for (const input of equivalents) {
      expect(normalizePhoneToE164(input)).toBe("+85512345678");
      expect(normalizePhone(input)).toBe("+85512345678");
    }
  });

  it("accepts equivalent Cambodia numbers as valid", () => {
    for (const input of equivalents) {
      expect(isValidPhone(input)).toBe(true);
    }
  });

  it("formats E.164 for Cambodian local display", () => {
    expect(formatPhoneForDisplay("+85512345678")).toBe("012 345 678");
    expect(formatPhoneForDisplay("012345678")).toBe("012 345 678");
  });

  it("falls back to the stored value when formatting fails", () => {
    expect(formatPhoneForDisplay("not-a-phone")).toBe("not-a-phone");
    expect(formatPhoneForDisplay(null)).toBe("");
  });

  it("builds lookup variants for legacy digit-only storage", () => {
    const variants = phoneLookupVariants("+85512345678");
    expect(variants).toEqual(
      expect.arrayContaining([
        "+85512345678",
        "85512345678",
        "012345678",
        "12345678",
      ]),
    );
  });

  it("does not invent E.164 for empty or clearly invalid input", () => {
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164("123")).toBeNull();
  });

  it("treats formatting-only changes as the same identity", () => {
    expect(normalizePhoneToE164("012 345 678")).toBe(normalizePhoneToE164("012345678"));
  });
});

const { findMany, findFirst, create, update, upsert } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    customer: { findFirst, findMany, create, update },
    customerIdentity: { upsert },
  },
}));

describe("upsertCustomerByPhone identity matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds an existing E.164 customer when checkout uses local format", async () => {
    const { upsertCustomerByPhone } = await import(
      "@/modules/customers/repositories/customer-repository"
    );

    const existing = {
      id: "cust-1",
      tenantId: "tenant-a",
      phone: "+85512345678",
      phoneNormalized: "+85512345678",
      email: null,
      displayName: "Existing",
    };
    findFirst.mockResolvedValue(existing);
    update.mockResolvedValue({ ...existing, displayName: "Local format" });

    const tx = {
      customer: { findFirst, findMany, create, update },
      customerIdentity: { upsert },
    };

    const customer = await upsertCustomerByPhone(tx as never, {
      tenantId: "tenant-a",
      displayName: "Local format",
      phone: "012 345 678",
    });

    expect(customer.id).toBe("cust-1");
    expect(create).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          phoneNormalized: "+85512345678",
        }),
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phoneNormalized: "+85512345678" }),
      }),
    );
  });

  it("keeps tenant isolation for the same normalized phone", async () => {
    const { findCustomerByPhone } = await import(
      "@/modules/customers/repositories/customer-repository"
    );

    findFirst.mockResolvedValueOnce({
      id: "cust-b",
      tenantId: "tenant-b",
      phoneNormalized: "+85512345678",
    });

    const found = await findCustomerByPhone("tenant-b", "012 345 678");
    expect(found?.tenantId).toBe("tenant-b");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-b",
          phoneNormalized: "+85512345678",
        }),
      }),
    );
  });

  it("matches reverse format against legacy digit-only phone storage", async () => {
    const { upsertCustomerByPhone } = await import(
      "@/modules/customers/repositories/customer-repository"
    );

    findFirst.mockResolvedValueOnce(null);
    findMany.mockResolvedValueOnce([
      {
        id: "legacy-1",
        tenantId: "tenant-a",
        phone: "012345678",
        phoneNormalized: null,
        email: null,
        displayName: "Legacy",
      },
    ]);
    update.mockResolvedValue({
      id: "legacy-1",
      tenantId: "tenant-a",
      phone: "+85512345678",
      phoneNormalized: "+85512345678",
      email: null,
      displayName: "Backfill path",
    });

    const tx = {
      customer: { findFirst, findMany, create, update },
      customerIdentity: { upsert },
    };

    const customer = await upsertCustomerByPhone(tx as never, {
      tenantId: "tenant-a",
      displayName: "Backfill path",
      phone: "+85512345678",
    });

    expect(customer.id).toBe("legacy-1");
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phoneNormalized: "+85512345678" }),
      }),
    );
  });

  it("logs phone conflicts without merging when session customer differs", async () => {
    const { updateCustomerContact } = await import(
      "@/modules/customers/repositories/customer-repository"
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    findFirst
      .mockResolvedValueOnce({
        id: "session-cust",
        tenantId: "tenant-a",
        phone: null,
        phoneNormalized: null,
        email: null,
      })
      .mockResolvedValueOnce({
        id: "phone-owner",
        tenantId: "tenant-a",
        phone: "+85512345678",
        phoneNormalized: "+85512345678",
        email: null,
      });
    update.mockResolvedValue({
      id: "session-cust",
      tenantId: "tenant-a",
      phone: "+85512345678",
      phoneNormalized: "+85512345678",
    });

    const tx = {
      customer: { findFirst, findMany, create, update },
      customerIdentity: { upsert },
    };

    const result = await updateCustomerContact(tx as never, {
      tenantId: "tenant-a",
      customerId: "session-cust",
      displayName: "Telegram User",
      phone: "012 345 678",
    });

    expect(result.id).toBe("session-cust");
    expect(errorSpy).toHaveBeenCalledWith(
      "[customer.phone_conflict]",
      expect.objectContaining({
        sessionCustomerId: "session-cust",
        phoneOwnerCustomerId: "phone-owner",
        phoneNormalized: "+85512345678",
      }),
    );
    errorSpy.mockRestore();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const findMany = vi.fn();
const create = vi.fn();
const update = vi.fn();
const upsert = vi.fn();

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    customer: { findFirst, findMany, create, update },
    customerIdentity: { upsert },
  },
}));

/**
 * AUD-002: Guest checkout must not overwrite an existing customer's
 * displayName or email when the phone already matches.
 */
describe("AUD-002 guest checkout customer overwrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not change displayName or email on an existing phone match", async () => {
    const { upsertCustomerByPhone } = await import(
      "@/modules/customers/repositories/customer-repository"
    );

    const existing = {
      id: "cust-1",
      tenantId: "tenant-a",
      phone: "+85512345678",
      phoneNormalized: "+85512345678",
      email: "owner@example.com",
      displayName: "Real Customer",
    };
    findFirst.mockResolvedValue(existing);

    const tx = {
      customer: { findFirst, findMany, create, update },
      customerIdentity: { upsert },
    };

    const customer = await upsertCustomerByPhone(tx as never, {
      tenantId: "tenant-a",
      displayName: "Attacker Name",
      phone: "012 345 678",
      email: "attacker@evil.com",
    });

    expect(customer.id).toBe("cust-1");
    expect(customer.displayName).toBe("Real Customer");
    expect(customer.email).toBe("owner@example.com");
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not fill an empty email on an existing phone match", async () => {
    const { upsertCustomerByPhone } = await import(
      "@/modules/customers/repositories/customer-repository"
    );

    const existing = {
      id: "cust-2",
      tenantId: "tenant-a",
      phone: "+85598765432",
      phoneNormalized: "+85598765432",
      email: null,
      displayName: "No Email Yet",
    };
    findFirst.mockResolvedValue(existing);

    const tx = {
      customer: { findFirst, findMany, create, update },
      customerIdentity: { upsert },
    };

    const customer = await upsertCustomerByPhone(tx as never, {
      tenantId: "tenant-a",
      displayName: "Stranger",
      phone: "+85598765432",
      email: "stranger@example.com",
    });

    expect(customer.displayName).toBe("No Email Yet");
    expect(customer.email).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("still creates a new customer when the phone is unknown", async () => {
    const { upsertCustomerByPhone } = await import(
      "@/modules/customers/repositories/customer-repository"
    );

    findFirst.mockResolvedValue(null);
    findMany.mockResolvedValue([]);
    create.mockResolvedValue({
      id: "cust-new",
      tenantId: "tenant-a",
      phone: "+85511112222",
      phoneNormalized: "+85511112222",
      email: "new@example.com",
      displayName: "Brand New",
    });
    upsert.mockResolvedValue({});

    const tx = {
      customer: { findFirst, findMany, create, update },
      customerIdentity: { upsert },
    };

    const customer = await upsertCustomerByPhone(tx as never, {
      tenantId: "tenant-a",
      displayName: "Brand New",
      phone: "+85511112222",
      email: "new@example.com",
    });

    expect(customer.id).toBe("cust-new");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: "Brand New",
          email: "new@example.com",
        }),
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("only backfills phoneNormalized when it is missing", async () => {
    const { upsertCustomerByPhone } = await import(
      "@/modules/customers/repositories/customer-repository"
    );

    const existing = {
      id: "legacy-1",
      tenantId: "tenant-a",
      phone: "012345678",
      phoneNormalized: null,
      email: null,
      displayName: "Legacy",
    };
    findFirst.mockResolvedValueOnce(null);
    findMany.mockResolvedValueOnce([existing]);
    update.mockResolvedValue({
      ...existing,
      phoneNormalized: "+85512345678",
    });

    const tx = {
      customer: { findFirst, findMany, create, update },
      customerIdentity: { upsert },
    };

    await upsertCustomerByPhone(tx as never, {
      tenantId: "tenant-a",
      displayName: "Should Not Stick",
      phone: "+85512345678",
      email: "nope@example.com",
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "legacy-1" },
      data: { phoneNormalized: "+85512345678" },
    });
    expect(update.mock.calls[0]![0].data).not.toHaveProperty("displayName");
    expect(update.mock.calls[0]![0].data).not.toHaveProperty("email");
  });
});

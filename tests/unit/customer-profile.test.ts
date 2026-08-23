import { describe, expect, it } from "vitest";

import {
  composeDisplayName,
  customerAddressInputSchema,
  customerProfileUpdateSchema,
} from "@/modules/customers";
import {
  customerOrderStatusLabel,
  formatAddressShort,
} from "@/modules/customers/types";

describe("customerProfileUpdateSchema", () => {
  it("normalizes phone and email and builds display name", () => {
    const parsed = customerProfileUpdateSchema.parse({
      firstName: "  Ada  ",
      lastName: " Lovelace ",
      displayName: "",
      phone: "+855 12 345 678",
      email: "Ada@Example.COM",
    });
    expect(parsed.firstName).toBe("Ada");
    expect(parsed.lastName).toBe("Lovelace");
    expect(parsed.displayName).toBe("Ada Lovelace");
    expect(parsed.phone).toBe("85512345678");
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects invalid phone", () => {
    const parsed = customerProfileUpdateSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "123",
      email: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const parsed = customerProfileUpdateSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "85512345678",
      email: "not-an-email",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("customerAddressInputSchema", () => {
  it("accepts a valid address and uppercases country", () => {
    const parsed = customerAddressInputSchema.parse({
      label: " Home ",
      recipientFirstName: "Kin",
      recipientLastName: "Customer",
      phone: "85512345678",
      addressLine1: "Street 1",
      addressLine2: "",
      cityOrDistrict: "Phnom Penh",
      provinceOrState: "Phnom Penh",
      postalCode: "",
      countryCode: "kh",
      deliveryInstructions: "",
      isDefault: true,
    });
    expect(parsed.label).toBe("Home");
    expect(parsed.countryCode).toBe("KH");
    expect(parsed.addressLine2).toBeUndefined();
  });

  it("rejects missing address line", () => {
    const parsed = customerAddressInputSchema.safeParse({
      label: "Home",
      recipientFirstName: "Kin",
      recipientLastName: "Customer",
      phone: "85512345678",
      addressLine1: "",
      cityOrDistrict: "Phnom Penh",
      provinceOrState: "Phnom Penh",
      countryCode: "KH",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("first-time Telegram profile display", () => {
  it("does not require phone, email, or a pre-filled name to show Account", () => {
    expect(
      composeDisplayName({
        firstName: null,
        lastName: null,
        displayName: "Telegram 55",
      }),
    ).toBe("Telegram 55");
    expect(
      composeDisplayName({
        firstName: null,
        lastName: null,
        displayName: null,
      }),
    ).toBeNull();
  });
});

describe("customer order helpers", () => {
  it("maps status labels", () => {
    expect(customerOrderStatusLabel("out_for_delivery")).toBe("Out for delivery");
    expect(customerOrderStatusLabel("ready_for_pickup")).toBe("Ready for pickup");
  });

  it("formats short address", () => {
    expect(
      formatAddressShort({
        addressLine1: "12 St",
        cityOrDistrict: "PP",
        provinceOrState: "PP",
      }),
    ).toBe("12 St, PP, PP");
  });
});

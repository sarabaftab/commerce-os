import { describe, expect, it, vi } from "vitest";

const { reverseGeocodeLatLng } = vi.hoisted(() => ({
  reverseGeocodeLatLng: vi.fn(),
}));

vi.mock("@/modules/locations", () => ({
  reverseGeocodeLatLng,
}));

import { GET } from "@/app/api/location/reverse/route";

describe("location reverse endpoint", () => {
  it("rejects missing coordinates", async () => {
    const response = await GET(new Request("http://localhost/api/location/reverse"));
    expect(response.status).toBe(400);
    expect(reverseGeocodeLatLng).not.toHaveBeenCalled();
  });

  it("returns a resolved Photon result for valid coordinates", async () => {
    reverseGeocodeLatLng.mockResolvedValueOnce({
      id: "photon:1",
      formattedAddress: "Street 2004, Phnom Penh, Cambodia",
      street: "Street 2004",
      houseNumber: null,
      district: null,
      city: "Phnom Penh",
      province: "Phnom Penh",
      postalCode: null,
      country: "Cambodia",
      countryCode: "KH",
      latitude: 11.54,
      longitude: 104.8,
      label: "Street 2004, Phnom Penh, Cambodia",
      provider: "photon",
    });

    const response = await GET(
      new Request("http://localhost/api/location/reverse?lat=11.54&lng=104.8"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.result.formattedAddress).toContain("Street 2004");
    expect(reverseGeocodeLatLng).toHaveBeenCalledWith({
      latitude: 11.54,
      longitude: 104.8,
    });
  });
});

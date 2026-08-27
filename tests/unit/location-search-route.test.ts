import { describe, expect, it, vi } from "vitest";

const { searchLocations } = vi.hoisted(() => ({
  searchLocations: vi.fn(),
}));

vi.mock("@/modules/locations", () => ({
  searchLocations,
}));

import { GET } from "@/app/api/location/search/route";

describe("location search endpoint", () => {
  it("does not call Photon below the minimum query length", async () => {
    const response = await GET(new Request("http://localhost/api/location/search?q=p"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { results: [] } });
    expect(searchLocations).not.toHaveBeenCalled();
  });

  it("rejects oversized queries", async () => {
    const response = await GET(
      new Request(`http://localhost/api/location/search?q=${"a".repeat(121)}`),
    );

    expect(response.status).toBe(400);
    expect(searchLocations).not.toHaveBeenCalled();
  });
});

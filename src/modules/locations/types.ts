export type LocationSearchResult = {
  id: string;
  label: string;
  formattedAddress: string;
  street: string | null;
  houseNumber: string | null;
  district: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  provider: "photon";
};

export type LocationSearchResponse = {
  results: LocationSearchResult[];
};

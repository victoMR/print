export type GeoState = {
  cveEnt: string;
  stateCode: string;
  name: string;
};

export type GeoMunicipality = {
  cveMun: string;
  cveGeo: string;
  name: string;
};

export type PostalLookup = {
  zip: string;
  stateCode: string;
  stateName: string;
  municipality: string;
  city: string;
  colonies: Array<{ name: string; type: string }>;
};

async function geoFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const json = (await res.json()) as { data?: T; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  return json.data as T;
}

export function fetchGeoStates(): Promise<GeoState[]> {
  return geoFetch<GeoState[]>("/api/v1/geo/states");
}

export function fetchGeoMunicipalities(stateCode: string): Promise<GeoMunicipality[]> {
  return geoFetch<GeoMunicipality[]>(
    `/api/v1/geo/states/${encodeURIComponent(stateCode)}/municipalities`,
  );
}

export function lookupPostalCode(zip: string): Promise<PostalLookup> {
  const digits = zip.replace(/\D/g, "").slice(0, 5);
  return geoFetch<PostalLookup>(`/api/v1/geo/postal/${digits}`);
}

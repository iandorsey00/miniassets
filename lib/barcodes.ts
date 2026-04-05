import { normalizeBarcode } from "@/lib/present";

export type BarcodeLookupResult = {
  code: string;
  provider: string;
  title?: string;
  brand?: string;
  model?: string;
  raw?: unknown;
};

export async function lookupBarcode(code: string): Promise<BarcodeLookupResult | null> {
  const normalized = normalizeBarcode(code);
  if (!normalized) {
    return null;
  }

  const template = process.env.BARCODE_LOOKUP_URL_TEMPLATE?.trim();
  if (!template) {
    return null;
  }

  const url = template.replaceAll("{code}", encodeURIComponent(normalized));
  const authHeader = process.env.BARCODE_LOOKUP_AUTH_HEADER?.trim();
  const response = await fetch(url, {
    headers: authHeader ? { Authorization: authHeader } : undefined,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Barcode lookup failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return {
    code: normalized,
    provider: "configured-provider",
    title: typeof payload.title === "string" ? payload.title : undefined,
    brand: typeof payload.brand === "string" ? payload.brand : undefined,
    model: typeof payload.model === "string" ? payload.model : undefined,
    raw: payload,
  };
}

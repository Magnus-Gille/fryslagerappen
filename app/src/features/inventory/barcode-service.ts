export type ProductMappingSource = 'home' | 'open_food_facts';

export type BarcodeProductProposal = {
  barcode: string;
  name: string;
  category: string;
  unit: string;
  imageUrl?: string;
  mappingSource: ProductMappingSource;
};

type BarcodeResponse = {
  source: ProductMappingSource;
  product: {
    barcode: string;
    name: string;
    category: string;
    unit: string;
    imageUrl?: string;
  };
};

export function normalizeBarcode(value: string) {
  const normalized = value.trim();
  return /^\d{8,14}$/.test(normalized) ? normalized : undefined;
}

export function productProposalFromResponse(response: BarcodeResponse): BarcodeProductProposal {
  return {
    barcode: response.product.barcode,
    name: response.product.name,
    category: response.product.category,
    unit: response.product.unit,
    imageUrl: response.product.imageUrl,
    mappingSource: response.source,
  };
}

const memoryCache = new Map<string, BarcodeProductProposal>();

function cacheKey(homeId: string, barcode: string) {
  return `iceage_barcode_${homeId.replace(/[^A-Za-z0-9._-]/g, '_')}_${barcode}`;
}

async function readCachedProduct(homeId: string, barcode: string) {
  const key = cacheKey(homeId, barcode);
  const memoryValue = memoryCache.get(key);
  if (memoryValue) return memoryValue;
  try {
    const storage = await import('expo-secure-store');
    const value = await storage.getItemAsync(key);
    const product = value ? (JSON.parse(value) as BarcodeProductProposal) : undefined;
    if (product) memoryCache.set(key, product);
    return product;
  } catch {
    return undefined;
  }
}

async function cacheProduct(homeId: string, product: BarcodeProductProposal) {
  const key = cacheKey(homeId, product.barcode);
  memoryCache.set(key, product);
  try {
    const storage = await import('expo-secure-store');
    await storage.setItemAsync(key, JSON.stringify(product));
  } catch {
    // The shared server mapping remains the source of truth if local caching is unavailable.
  }
}

export async function lookupBarcode(
  value: string,
  homeId = 'local',
): Promise<BarcodeProductProposal> {
  const barcode = normalizeBarcode(value);
  if (!barcode) throw new Error('Streckkoden ska innehålla 8–14 siffror.');
  const cached = await readCachedProduct(homeId, barcode);
  if (cached) return cached;
  const { pocketbase } = await import('@/lib/pocketbase');
  if (!pocketbase) throw new Error('Streckkodsuppslag kräver anslutning till hemmet.');
  const response = await pocketbase.send<BarcodeResponse>(
    `/api/iceage/barcodes/${encodeURIComponent(barcode)}`,
    { method: 'GET' },
  );
  const product = productProposalFromResponse(response);
  await cacheProduct(homeId, product);
  return product;
}

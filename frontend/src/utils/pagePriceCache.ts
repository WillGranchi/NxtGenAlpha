/**
 * Simple in-memory cache for per-page price series (SPA navigation only).
 * This prevents blank/loading flashes when navigating away and back.
 */
export type PagePriceCacheKey = string;

export interface PagePriceCacheEntry<T> {
  key: PagePriceCacheKey;
  value: T;
  updatedAt: number;
}

const cache = new Map<PagePriceCacheKey, PagePriceCacheEntry<any>>();

export function makePagePriceCacheKey(parts: {
  page: string;
  symbol: string;
  exchange?: string;
  startDate?: string;
  endDate?: string;
  interval?: string;
}): PagePriceCacheKey {
  return [
    parts.page,
    parts.symbol || '',
    parts.exchange || '',
    parts.startDate || '',
    parts.endDate || '',
    parts.interval || '',
  ].join('|');
}

export function getPagePriceCache<T>(key: PagePriceCacheKey): PagePriceCacheEntry<T> | null {
  return (cache.get(key) as PagePriceCacheEntry<T> | undefined) ?? null;
}

export function setPagePriceCache<T>(key: PagePriceCacheKey, value: T): void {
  cache.set(key, { key, value, updatedAt: Date.now() });
}



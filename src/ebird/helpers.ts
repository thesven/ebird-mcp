import { callEbirdEndpoint } from './client.js';
import { requestJson } from '../utils/fetch.js';

export interface TaxonRecord {
  speciesCode: string;
  comName: string;
  sciName: string;
  category?: string;
  order?: string;
  familyCode?: string;
  familyComName?: string;
  familySciName?: string;
  bandingCodes?: string[];
}

let taxonomyCache: TaxonRecord[] | null = null;
let taxonomyFetchPromise: Promise<TaxonRecord[]> | null = null;

export function setTaxonomyCacheForTesting(cache: TaxonRecord[] | null): void {
  taxonomyCache = cache;
  taxonomyFetchPromise = null;
}

export async function getTaxonomy(forceRefresh = false): Promise<TaxonRecord[]> {
  if (taxonomyCache && !forceRefresh) {
    return taxonomyCache;
  }

  if (taxonomyFetchPromise && !forceRefresh) {
    return taxonomyFetchPromise;
  }

  taxonomyFetchPromise = (async () => {
    try {
      const data = (await requestJson(
        'https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&cat=species',
        { method: 'GET' },
      )) as TaxonRecord[];

      if (Array.isArray(data)) {
        taxonomyCache = data;
        return data;
      }
      return [];
    } finally {
      taxonomyFetchPromise = null;
    }
  })();

  return taxonomyFetchPromise;
}

export interface SearchSpeciesOptions {
  category?: string;
  maxResults?: number;
}

export async function searchSpecies(
  query: string,
  options: SearchSpeciesOptions = {},
): Promise<TaxonRecord[]> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }

  const allTaxa = await getTaxonomy();
  const maxResults = options.maxResults ?? 10;
  const categoryFilter = options.category?.toLowerCase();

  const scored: Array<{ taxon: TaxonRecord; score: number }> = [];

  for (const taxon of allTaxa) {
    if (categoryFilter && taxon.category?.toLowerCase() !== categoryFilter) {
      continue;
    }

    const code = taxon.speciesCode?.toLowerCase() ?? '';
    const comName = taxon.comName?.toLowerCase() ?? '';
    const sciName = taxon.sciName?.toLowerCase() ?? '';
    const banding = taxon.bandingCodes?.map((b) => b.toLowerCase()) ?? [];

    let score = -1;

    if (code === q || banding.includes(q)) {
      score = 100;
    } else if (comName === q) {
      score = 90;
    } else if (comName.startsWith(q)) {
      score = 80;
    } else if (comName.includes(` ${q}`)) {
      score = 70;
    } else if (sciName.startsWith(q)) {
      score = 60;
    } else if (comName.includes(q)) {
      score = 50;
    } else if (sciName.includes(q)) {
      score = 40;
    } else if (code.includes(q)) {
      score = 30;
    }

    if (score > 0) {
      scored.push({ taxon, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.taxon.comName.localeCompare(b.taxon.comName));

  return scored.slice(0, maxResults).map((s) => ({
    speciesCode: s.taxon.speciesCode,
    comName: s.taxon.comName,
    sciName: s.taxon.sciName,
    category: s.taxon.category,
    order: s.taxon.order,
    familyComName: s.taxon.familyComName,
    familySciName: s.taxon.familySciName,
  }));
}

export interface SearchHotspotsOptions {
  regionCode?: string;
  lat?: number;
  lng?: number;
  dist?: number;
  back?: number;
  query?: string;
  maxResults?: number;
  apiKey?: string;
}

export interface HotspotRecord {
  locId: string;
  locName: string;
  lat: number;
  lng: number;
  countryCode?: string;
  subnational1Code?: string;
  subnational2Code?: string;
  latestObsDt?: string;
  numSpeciesAllTime?: number;
}

export async function searchHotspots(
  options: SearchHotspotsOptions = {},
): Promise<HotspotRecord[]> {
  const maxResults = options.maxResults ?? 20;
  let rawData: unknown;

  if (options.lat !== undefined && options.lng !== undefined) {
    rawData = await callEbirdEndpoint('ref_hotspot_geo', {
      lat: options.lat,
      lng: options.lng,
      dist: options.dist ?? 25,
      back: options.back,
      fmt: 'json',
      ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    });
  } else if (options.regionCode) {
    rawData = await callEbirdEndpoint('ref_hotspot', {
      regionCode: options.regionCode,
      back: options.back,
      fmt: 'json',
      ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    });
  } else {
    throw new Error(
      "Either 'regionCode' or both 'lat' and 'lng' must be provided to search hotspots.",
    );
  }

  if (!Array.isArray(rawData)) {
    return [];
  }

  let list = rawData as HotspotRecord[];

  if (options.query && options.query.trim()) {
    const q = options.query.trim().toLowerCase();
    list = list.filter((h) => h.locName && h.locName.toLowerCase().includes(q));
  }

  return list.slice(0, maxResults);
}

export interface LookupRegionsOptions {
  regionType: 'country' | 'subnational1' | 'subnational2';
  parentRegionCode: string;
  query?: string;
  maxResults?: number;
  apiKey?: string;
}

export interface RegionRecord {
  code: string;
  name: string;
}

export async function lookupRegions(options: LookupRegionsOptions): Promise<RegionRecord[]> {
  const rawData = await callEbirdEndpoint('ref_region_list', {
    regionType: options.regionType,
    parentRegionCode: options.parentRegionCode,
    fmt: 'json',
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
  });

  if (!Array.isArray(rawData)) {
    return [];
  }

  let list = rawData as RegionRecord[];

  if (options.query && options.query.trim()) {
    const q = options.query.trim().toLowerCase();
    list = list.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.code && r.code.toLowerCase().includes(q)),
    );
  }

  const maxResults = options.maxResults ?? 50;
  return list.slice(0, maxResults);
}

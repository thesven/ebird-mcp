import * as z from 'zod';

export interface EndpointDef {
  name: string;
  title: string;
  description: string;
  pathTemplate: string;
  method: 'GET';
  requiresApiKey: boolean;
  pathParams: readonly string[];
  querySchema: z.ZodRawShape;
  queryDefaults: Record<string, string | number | boolean>;
}

const Q = {
  regionCode: () =>
    z
      .string()
      .trim()
      .min(1)
      .describe(
        'eBird region code: country (e.g. "US", "CR"), subnational1 state/province ("US-NY", "CA-ON"), subnational2 county ("US-NY-061"), or location ID ("L99381")',
      ),
  speciesCode: () =>
    z
      .string()
      .trim()
      .min(1)
      .describe(
        '6-letter eBird species code (e.g. "cangoo" for Canada Goose, "baleag" for Bald Eagle). Use ebird_search_species to find codes.',
      ),
  subId: () =>
    z.string().trim().min(1).describe('eBird checklist submission identifier (e.g. "S12345678")'),
  locId: () =>
    z.string().trim().min(1).describe('eBird location or hotspot identifier (e.g. "L99381")'),
  parentRegionCode: () =>
    z
      .string()
      .trim()
      .min(1)
      .describe(
        'Parent region code: "world" for countries, country code (e.g. "US") for states, state code (e.g. "US-NY") for counties',
      ),
  regionType: () =>
    z
      .string()
      .trim()
      .min(1)
      .describe(
        'Type of region to list: "country", "subnational1" (states/provinces), or "subnational2" (counties)',
      ),
  speciesGrouping: () =>
    z.string().trim().min(1).describe('Grouping standard for taxonomy (e.g. "ebird", "merlin")'),
  back: () =>
    z.coerce
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe('Number of days back to look for observations (1-30, default 30)'),
  cat: () =>
    z
      .string()
      .trim()
      .optional()
      .describe(
        'Species category filter: comma-separated list of categories (e.g. "species", "slash", "spuh", "hybrid", "domestic")',
      ),
  hotspot: () =>
    z
      .preprocess(
        (value) => (typeof value === 'string' ? value.toLowerCase() === 'true' : value),
        z.boolean(),
      )
      .optional()
      .describe('If true, only fetch observations submitted from official eBird hotspots'),
  includeProvisional: () =>
    z
      .preprocess(
        (value) => (typeof value === 'string' ? value.toLowerCase() === 'true' : value),
        z.boolean(),
      )
      .optional()
      .describe('If true, include provisional/unreviewed observations'),
  maxResults: () =>
    z.coerce
      .number()
      .int()
      .positive()
      .max(10000)
      .optional()
      .describe('Maximum number of results to return (1-10000, default 10)'),
  maxResultsTop: () =>
    z.coerce
      .number()
      .int()
      .positive()
      .max(200)
      .optional()
      .describe('Maximum results for top list feeds (1-200, default 100)'),
  r: () =>
    z
      .string()
      .trim()
      .optional()
      .describe(
        'Up to 10 comma-separated location codes (e.g. "L99381,L99382") to fetch observations from',
      ),
  sppLocale: () =>
    z
      .string()
      .trim()
      .optional()
      .describe('Locale code for species common names (e.g. "en", "es", "fr", "de", "zh")'),
  detail: () =>
    z
      .enum(['simple', 'full'])
      .optional()
      .describe(
        'Level of observation detail: "simple" for key fields or "full" for complete checklist record',
      ),
  y: () =>
    z.coerce
      .number()
      .int()
      .min(1900)
      .max(3000)
      .optional()
      .describe('Year of observation (e.g. 2026)'),
  m: () =>
    z.coerce.number().int().min(1).max(12).optional().describe('Month of observation (1-12)'),
  d: () => z.coerce.number().int().min(1).max(31).optional().describe('Day of observation (1-31)'),
  lat: () =>
    z.coerce
      .number()
      .min(-90)
      .max(90)
      .optional()
      .describe('Latitude in decimal degrees (-90 to 90)'),
  lng: () =>
    z.coerce
      .number()
      .min(-180)
      .max(180)
      .optional()
      .describe('Longitude in decimal degrees (-180 to 180)'),
  dist: () =>
    z.coerce
      .number()
      .min(0)
      .max(500)
      .optional()
      .describe('Search radius from coordinates in kilometers (0-50 km, max 500 km, default 5 km)'),
  sort: () =>
    z
      .enum(['date', 'species'])
      .optional()
      .describe('Sort order: "date" (most recent first) or "species" (taxonomic order)'),
  rank: () => z.string().trim().optional().describe('Ranking criteria for historic observations'),
  rankedBy: () =>
    z
      .enum(['spp', 'cnp', 'ob'])
      .optional()
      .describe(
        'Ranking criteria: "spp" (species count), "cnp" (complete checklists), or "ob" (species on complete checklists)',
      ),
  sortKey: () =>
    z
      .enum(['obs_dt', 'creation_dt'])
      .optional()
      .describe(
        'Sort checklists by "obs_dt" (observation date) or "creation_dt" (submission date)',
      ),
  fmt: () =>
    z.enum(['json', 'csv']).optional().describe('Response format: "json" (default) or "csv"'),
  locale: () =>
    z.string().trim().optional().describe('Locale for taxonomy common names (default: "en")'),
  species: () =>
    z
      .string()
      .trim()
      .optional()
      .describe('Single species code or comma-separated species codes to filter taxonomy'),
  version: () => z.string().trim().optional().describe('Specific taxonomy version (e.g. "2026")'),
  groupNameLocale: () => z.string().trim().optional().describe('Locale for taxonomic group names'),
  regionNameFormat: () =>
    z
      .enum(['detailed', 'detailednoqual', 'full', 'namequal', 'nameonly', 'revdetailed'])
      .optional()
      .describe('Format of region name string (e.g. "detailed", "nameonly", "revdetailed")'),
  delim: () =>
    z.string().trim().optional().describe('Delimiter character for region name components'),
};

function tool(
  name: string,
  desc: string,
  pathTemplate: string,
  requiresApiKey: boolean,
  pathParams: string[],
  querySchema: z.ZodRawShape,
  queryDefaults: Record<string, string | number | boolean> = {},
): EndpointDef {
  return {
    name,
    title: desc,
    description: desc,
    pathTemplate,
    method: 'GET',
    requiresApiKey,
    pathParams,
    querySchema,
    queryDefaults,
  };
}

export const ebirdEndpointDefinitions: EndpointDef[] = [
  tool(
    'data_obs_recent',
    'Recent observations in a region',
    '/data/obs/{regionCode}/recent',
    true,
    ['regionCode'],
    {
      regionCode: Q.regionCode(),
      back: Q.back(),
      cat: Q.cat(),
      hotspot: Q.hotspot(),
      includeProvisional: Q.includeProvisional(),
      maxResults: Q.maxResults(),
      r: Q.r(),
      sppLocale: Q.sppLocale(),
    },
    {
      back: 30,
      maxResults: 10,
    },
  ),
  tool(
    'data_obs_recent_notable',
    'Recent notable observations in a region',
    '/data/obs/{regionCode}/recent/notable',
    true,
    ['regionCode'],
    {
      regionCode: Q.regionCode(),
      back: Q.back(),
      detail: Q.detail(),
      hotspot: Q.hotspot(),
      maxResults: Q.maxResults(),
      r: Q.r(),
      sppLocale: Q.sppLocale(),
    },
    {
      back: 30,
      maxResults: 10,
    },
  ),
  tool(
    'data_obs_recent_species',
    'Recent observations of one species in a region',
    '/data/obs/{regionCode}/recent/{speciesCode}',
    true,
    ['regionCode', 'speciesCode'],
    {
      regionCode: Q.regionCode(),
      speciesCode: Q.speciesCode(),
      back: Q.back(),
      hotspot: Q.hotspot(),
      includeProvisional: Q.includeProvisional(),
      maxResults: Q.maxResults(),
      r: Q.r(),
      sppLocale: Q.sppLocale(),
    },
    {
      back: 30,
      maxResults: 10,
    },
  ),
  tool(
    'data_obs_geo_recent',
    'Recent observations by lat/long',
    '/data/obs/geo/recent',
    true,
    [],
    {
      lat: Q.lat(),
      lng: Q.lng(),
      back: Q.back(),
      cat: Q.cat(),
      dist: Q.dist(),
      hotspot: Q.hotspot(),
      includeProvisional: Q.includeProvisional(),
      maxResults: Q.maxResults(),
      sort: Q.sort(),
      sppLocale: Q.sppLocale(),
    },
    {
      dist: 5,
      back: 30,
      maxResults: 10,
    },
  ),
  tool(
    'data_obs_geo_recent_species',
    'Recent observations of one species by lat/long',
    '/data/obs/geo/recent/{speciesCode}',
    true,
    ['speciesCode'],
    {
      speciesCode: Q.speciesCode(),
      lat: Q.lat(),
      lng: Q.lng(),
      back: Q.back(),
      dist: Q.dist(),
      hotspot: Q.hotspot(),
      includeProvisional: Q.includeProvisional(),
      maxResults: Q.maxResults(),
      sppLocale: Q.sppLocale(),
    },
    {
      dist: 5,
      back: 30,
      maxResults: 10,
    },
  ),
  tool(
    'data_nearest_geo_recent_species',
    'Nearest recent observations of a species',
    '/data/nearest/geo/recent/{speciesCode}',
    true,
    ['speciesCode'],
    {
      speciesCode: Q.speciesCode(),
      lat: Q.lat(),
      lng: Q.lng(),
      back: Q.back(),
      dist: Q.dist(),
      hotspot: Q.hotspot(),
      includeProvisional: Q.includeProvisional(),
      maxResults: Q.maxResults(),
      sppLocale: Q.sppLocale(),
    },
    {
      dist: 5,
      back: 30,
      maxResults: 10,
    },
  ),
  tool(
    'data_obs_geo_recent_notable',
    'Recent notable observations by lat/long',
    '/data/obs/geo/recent/notable',
    true,
    [],
    {
      lat: Q.lat(),
      lng: Q.lng(),
      back: Q.back(),
      detail: Q.detail(),
      dist: Q.dist(),
      hotspot: Q.hotspot(),
      maxResults: Q.maxResults(),
      sppLocale: Q.sppLocale(),
    },
    {
      dist: 5,
      back: 30,
      maxResults: 10,
    },
  ),
  tool(
    'data_obs_historic',
    'Historic observations by region and date',
    '/data/obs/{regionCode}/historic/{y}/{m}/{d}',
    true,
    ['regionCode', 'y', 'm', 'd'],
    {
      regionCode: Q.regionCode(),
      y: Q.y(),
      m: Q.m(),
      d: Q.d(),
      cat: Q.cat(),
      detail: Q.detail(),
      hotspot: Q.hotspot(),
      includeProvisional: Q.includeProvisional(),
      maxResults: Q.maxResults(),
      rank: Q.rank(),
      r: Q.r(),
      sppLocale: Q.sppLocale(),
    },
    {
      maxResults: 20,
    },
  ),
  tool(
    'product_top100',
    'Top 100 product feed',
    '/product/top100/{regionCode}/{y}/{m}/{d}',
    true,
    ['regionCode', 'y', 'm', 'd'],
    {
      regionCode: Q.regionCode(),
      y: Q.y(),
      m: Q.m(),
      d: Q.d(),
      rankedBy: Q.rankedBy(),
      maxResults: Q.maxResultsTop(),
    },
    {
      rankedBy: 'spp',
      maxResults: 100,
    },
  ),
  tool(
    'product_lists',
    'Checklist feed for region',
    '/product/lists/{regionCode}',
    true,
    ['regionCode'],
    {
      regionCode: Q.regionCode(),
      maxResults: Q.maxResultsTop(),
    },
    {
      maxResults: 100,
    },
  ),
  tool(
    'product_lists_by_date',
    'Checklist feed by date',
    '/product/lists/{regionCode}/{y}/{m}/{d}',
    true,
    ['regionCode', 'y', 'm', 'd'],
    {
      regionCode: Q.regionCode(),
      y: Q.y(),
      m: Q.m(),
      d: Q.d(),
      sortKey: Q.sortKey(),
      maxResults: Q.maxResultsTop(),
    },
    {
      maxResults: 100,
    },
  ),
  tool(
    'product_stats',
    'Regional stats by date',
    '/product/stats/{regionCode}/{y}/{m}/{d}',
    true,
    ['regionCode', 'y', 'm', 'd'],
    {
      regionCode: Q.regionCode(),
      y: Q.y(),
      m: Q.m(),
      d: Q.d(),
    },
    {},
  ),
  tool(
    'product_spplist',
    'Species list for region',
    '/product/spplist/{regionCode}',
    true,
    ['regionCode'],
    {
      regionCode: Q.regionCode(),
    },
    {},
  ),
  tool(
    'product_checklist_view',
    'View checklist detail',
    '/product/checklist/view/{subId}',
    true,
    ['subId'],
    {
      subId: Q.subId(),
    },
    {},
  ),
  tool(
    'ref_adjacent',
    'Adjacent regions',
    '/ref/adjacent/{regionCode}',
    true,
    ['regionCode'],
    {
      regionCode: Q.regionCode(),
    },
    {},
  ),
  tool(
    'ref_hotspot',
    'Hotspots in a region',
    '/ref/hotspot/{regionCode}',
    true,
    ['regionCode'],
    {
      regionCode: Q.regionCode(),
      back: Q.back(),
      fmt: Q.fmt(),
    },
    {},
  ),
  tool(
    'ref_hotspot_geo',
    'Hotspots around a coordinate',
    '/ref/hotspot/geo',
    true,
    [],
    {
      lat: Q.lat(),
      lng: Q.lng(),
      back: Q.back(),
      dist: Q.dist(),
      fmt: Q.fmt(),
    },
    {
      dist: 20,
    },
  ),
  tool(
    'ref_hotspot_info',
    'Hotspot details',
    '/ref/hotspot/info/{locId}',
    true,
    ['locId'],
    {
      locId: Q.locId(),
    },
    {},
  ),
  tool(
    'ref_taxonomy',
    'eBird taxonomy snapshot (public endpoint)',
    '/ref/taxonomy/ebird',
    false,
    [],
    {
      cat: Q.cat(),
      fmt: Q.fmt(),
      locale: Q.locale(),
      species: Q.species(),
      version: Q.version(),
    },
    {},
  ),
  tool(
    'ref_taxon_forms',
    'Taxonomic forms for a species',
    '/ref/taxon/forms/{speciesCode}',
    true,
    ['speciesCode'],
    {
      speciesCode: Q.speciesCode(),
    },
    {},
  ),
  tool(
    'ref_taxa_locales_ebird',
    'Taxa locales supported by eBird',
    '/ref/taxa-locales/ebird',
    true,
    [],
    {},
    {},
  ),
  tool('ref_taxonomy_versions', 'Taxonomy versions', '/ref/taxonomy/versions', false, [], {}, {}),
  tool(
    'ref_sppgroup',
    'Taxonomic groups',
    '/ref/sppgroup/{speciesGrouping}',
    false,
    ['speciesGrouping'],
    {
      speciesGrouping: Q.speciesGrouping(),
      groupNameLocale: Q.groupNameLocale(),
    },
    {},
  ),
  tool(
    'ref_region_info',
    'Region info',
    '/ref/region/info/{regionCode}',
    true,
    ['regionCode'],
    {
      regionCode: Q.regionCode(),
      regionNameFormat: Q.regionNameFormat(),
      delim: Q.delim(),
    },
    {},
  ),
  tool(
    'ref_region_list',
    'Regions list for type + parent',
    '/ref/region/list/{regionType}/{parentRegionCode}',
    true,
    ['regionType', 'parentRegionCode'],
    {
      regionType: Q.regionType(),
      parentRegionCode: Q.parentRegionCode(),
      fmt: Q.fmt(),
    },
    {},
  ),
];

export const endpointByName = Object.fromEntries(
  ebirdEndpointDefinitions.map((definition) => [definition.name, definition]),
) as Record<string, EndpointDef>;

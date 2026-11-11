# MCP Server Architecture & Contracts

`ebird-mcp` provides a full-featured Model Context Protocol (MCP) server for the [eBird v2 API](https://documenter.getpostman.com/view/664302/S1ENwy59), equipped with 28 tools, standard MCP resources, and interactive prompts.

## Authentication Contract

Tools that query authenticated eBird endpoints support **environment-first authentication**:

1. **Environment Variable**: `EBIRD_API_KEY` set in the environment or `.env`/`~/.zshrc`/`~/.bashrc`.
2. **Per-Call Argument**: `apiKey` passed in the tool arguments.
3. If neither is provided, a clear and actionable error is returned explaining how to obtain and configure a key.

```json
{
  "regionCode": "US-NY",
  "back": 7,
  "maxResults": 20
}
```

_(No `apiKey` required in JSON payload when `EBIRD_API_KEY` is configured in the environment.)_

---

## Tool Catalog (28 Tools)

### AI Helper Tools (3 Tools)

- `ebird_search_species`: Resolve bird common names, scientific names, or banding codes to eBird's 6-letter `speciesCode`. Fast in-memory lookup.
- `ebird_search_hotspots`: Search birding hotspots by region or coordinates with optional keyword filtering.
- `ebird_lookup_region`: Search and explore country, state/province (`subnational1`), and county (`subnational2`) region codes.

### Observation Tools (8 Tools)

- `ebird_data_obs_recent`: Recent observations in a region (`GET /data/obs/{regionCode}/recent`).
- `ebird_data_obs_recent_notable`: Recent notable observations in a region (`GET /data/obs/{regionCode}/recent/notable`).
- `ebird_data_obs_recent_species`: Recent observations of a species in a region (`GET /data/obs/{regionCode}/recent/{speciesCode}`).
- `ebird_data_obs_geo_recent`: Recent observations by coordinates (`GET /data/obs/geo/recent`).
- `ebird_data_obs_geo_recent_species`: Recent observations of a species by coordinates (`GET /data/obs/geo/recent/{speciesCode}`).
- `ebird_data_nearest_geo_recent_species`: Nearest observations of a species by coordinates (`GET /data/nearest/geo/recent/{speciesCode}`).
- `ebird_data_obs_geo_recent_notable`: Recent notable observations by coordinates (`GET /data/obs/geo/recent/notable`).
- `ebird_data_obs_historic`: Historic observations on a specific date (`GET /data/obs/{regionCode}/historic/{y}/{m}/{d}`).

### Product & Checklist Tools (6 Tools)

- `ebird_product_top100`: Top 100 contributors leaderboard for a region on a date (`GET /product/top100/{regionCode}/{y}/{m}/{d}`).
- `ebird_product_lists`: Recent checklists feed for a region (`GET /product/lists/{regionCode}`).
- `ebird_product_lists_by_date`: Checklist feed for a region on a date (`GET /product/lists/{regionCode}/{y}/{m}/{d}`).
- `ebird_product_stats`: Regional birding statistics on a date (`GET /product/stats/{regionCode}/{y}/{m}/{d}`).
- `ebird_product_spplist`: All-time species checklist for a region (`GET /product/spplist/{regionCode}`).
- `ebird_product_checklist_view`: Detailed view of a checklist submission (`GET /product/checklist/view/{subId}`).

### Reference & Hotspot Tools (11 Tools)

- `ebird_ref_hotspot`: Hotspots in a region (`GET /ref/hotspot/{regionCode}`).
- `ebird_ref_hotspot_geo`: Hotspots near coordinates (`GET /ref/hotspot/geo`).
- `ebird_ref_hotspot_info`: Hotspot details by location ID (`GET /ref/hotspot/info/{locId}`).
- `ebird_ref_adjacent`: Neighboring/adjacent region codes (`GET /ref/adjacent/{regionCode}`).
- `ebird_ref_region_info`: Region name, bounds, and metadata (`GET /ref/region/info/{regionCode}`).
- `ebird_ref_region_list`: Sub-region hierarchy list (`GET /ref/region/list/{regionType}/{parentRegionCode}`).
- `ebird_ref_taxonomy`: Global eBird taxonomy snapshot (`GET /ref/taxonomy/ebird`).
- `ebird_ref_taxon_forms`: Subspecies/taxonomic forms (`GET /ref/taxon/forms/{speciesCode}`).
- `ebird_ref_taxa_locales_ebird`: Supported common name locale codes (`GET /ref/taxa-locales/ebird`).
- `ebird_ref_taxonomy_versions`: Taxonomy release versions (`GET /ref/taxonomy/versions`).
- `ebird_ref_sppgroup`: Taxonomic species groups (`GET /ref/sppgroup/{speciesGrouping}`).

---

## MCP Resources

- `ebird://server-info`: Server status, version, auth configuration, and catalog summary.
- `ebird://taxonomy/versions`: Historical and current eBird taxonomy versions.
- `ebird://locales`: Supported locale codes for localized common names.

---

## MCP Prompts

- `find-rare-birds`: Interactive prompt to discover and report notable/rare bird sightings in a region.
- `plan-birding-trip`: Guides planning a birding outing with top hotspots, target species, and optimal scheduling.
- `species-tracker`: Interactive tracking for target bird species sightings and hotspot locations.

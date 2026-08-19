# MCP tool contract

All tools are exposed by `name = "ebird_<group>_<operation>"`.

General pattern:

- Tools that require authenticated eBird calls include `apiKey` as an explicit input.
- Tool arguments are validated by Zod.
- Unknown args are rejected.

## Example request shapes

### Authenticated tool

- `ebird_data_obs_recent`

```json
{
  "apiKey": "your-ebird-token",
  "regionCode": "US-NY",
  "back": 7,
  "maxResults": 20
}
```

### Public tool

- `ebird_ref_taxonomy`

```json
{
  "locale": "en",
  "fmt": "json"
}
```

## Implemented endpoint mapping

- `data_obs_recent` -> `GET /data/obs/{regionCode}/recent`
- `data_obs_recent_notable` -> `GET /data/obs/{regionCode}/recent/notable`
- `data_obs_recent_species` -> `GET /data/obs/{regionCode}/recent/{speciesCode}`
- `data_obs_geo_recent` -> `GET /data/obs/geo/recent`
- `data_obs_geo_recent_species` -> `GET /data/obs/geo/recent/{speciesCode}`
- `data_nearest_geo_recent_species` -> `GET /data/nearest/geo/recent/{speciesCode}`
- `data_obs_geo_recent_notable` -> `GET /data/obs/geo/recent/notable`
- `data_obs_historic` -> `GET /data/obs/{regionCode}/historic/{y}/{m}/{d}`
- `product_top100` -> `GET /product/top100/{regionCode}/{y}/{m}/{d}`
- `product_lists` -> `GET /product/lists/{regionCode}`
- `product_lists_by_date` -> `GET /product/lists/{regionCode}/{y}/{m}/{d}`
- `product_stats` -> `GET /product/stats/{regionCode}/{y}/{m}/{d}`
- `product_spplist` -> `GET /product/spplist/{regionCode}`
- `product_checklist_view` -> `GET /product/checklist/view/{subId}`
- `ref_adjacent` -> `GET /ref/adjacent/{regionCode}`
- `ref_hotspot` -> `GET /ref/hotspot/{regionCode}`
- `ref_hotspot_geo` -> `GET /ref/hotspot/geo`
- `ref_hotspot_info` -> `GET /ref/hotspot/info/{locId}`
- `ref_taxonomy` -> `GET /ref/taxonomy/ebird`
- `ref_taxon_forms` -> `GET /ref/taxon/forms/{speciesCode}`
- `ref_taxa_locales_ebird` -> `GET /ref/taxa-locales/ebird`
- `ref_taxonomy_versions` -> `GET /ref/taxonomy/versions`
- `ref_sppgroup` -> `GET /ref/sppgroup/{speciesGrouping}`
- `ref_region_info` -> `GET /ref/region/info/{regionCode}`
- `ref_region_list` -> `GET /ref/region/list/{regionType}/{parentRegionCode}`

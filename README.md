# ebird-mcp

Cloudflare Workers hosted MCP server for the [eBird v2 API](https://documenter.getpostman.com/view/664302/S1ENwy59).

**Status**: scaffold and full implementation structure in place, ready for validation and deployment.

## Scope

- Implements MCP tools for eBird's documented v2 endpoints.
- Uses **per-request API key forwarding** for every tool that requires authentication.
- Hosted as a **Cloudflare Worker** with a `/mcp` endpoint.
- Deployable via GitHub Actions on Cloudflare free tier.

## Endpoints implemented (25 tools)

- 8 data/obs tools
- 6 product tools
- 1 ref/geo tool
- 3 ref/hotspot tools
- 5 ref/taxonomy tools
- 2 ref/region tools

### Tool naming pattern

Tool names are prefixed with `ebird_`, e.g. `ebird_data_obs_recent`.

Authenticated (require `apiKey`) tools:
- `ebird_data_obs_recent`
- `ebird_data_obs_recent_notable`
- `ebird_data_obs_recent_species`
- `ebird_data_obs_geo_recent`
- `ebird_data_obs_geo_recent_species`
- `ebird_data_nearest_geo_recent_species`
- `ebird_data_obs_geo_recent_notable`
- `ebird_data_obs_historic`
- `ebird_product_top100`
- `ebird_product_lists`
- `ebird_product_lists_by_date`
- `ebird_product_stats`
- `ebird_product_spplist`
- `ebird_product_checklist_view`
- `ebird_ref_adjacent`
- `ebird_ref_hotspot`
- `ebird_ref_hotspot_geo`
- `ebird_ref_hotspot_info`
- `ebird_ref_taxon_forms`
- `ebird_ref_taxa_locales_ebird`
- `ebird_ref_region_info`
- `ebird_ref_region_list`

No `apiKey` required:
- `ebird_ref_taxonomy`
- `ebird_ref_taxonomy_versions`
- `ebird_ref_sppgroup`

## Authentication behavior

For tools marked above as requiring `apiKey`, the request contract is:

```json
{
  "apiKey": "<your-ebird-token>",
  "regionCode": "US-NY"
}
```

`apiKey` is validated at input time and forwarded as `x-ebirdapitoken` in the eBird request.

The server does not persist or log this key.

## Local development

```bash
npm ci
npm run build
npm run test
npm run typecheck
npm run lint
```

## Cloudflare deployment

1. Ensure GitHub secrets are configured:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. Push to `main`.
3. GitHub Actions workflow `.github/workflows/deploy.yml` runs `wrangler deploy`.

Worker entry endpoint:
- `GET /health` for basic health check
- `POST /mcp` MCP streamable JSON transport
- `OPTIONS /mcp` CORS preflight

## Deployment notes (Free plan)

- No durable KV/Durable Object usage in core path (free tier friendly).
- No external storage requirements.
- Stateless MCP transport to keep worker memory usage low.

## Security notes

- All requests are HTTPS.
- API key only used when required by the specific endpoint.
- No key persistence.
- Errors are sanitized for logs, and key is never included in returned snippets.

## Notes on docs parsing

Endpoint set is based on the Postman collection behind the shared documentation. If a schema field changes in eBird docs, update
`src/ebird/endpoints.ts` and run full CI.

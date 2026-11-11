# ebird-mcp

[![CI](https://github.com/thesven/ebird-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/thesven/ebird-mcp/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](package.json)
[![MCP Protocol](https://img.shields.io/badge/MCP-2024--11--05-green.svg)](https://modelcontextprotocol.io)

A comprehensive, local-first [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [eBird v2 API](https://documenter.getpostman.com/view/664302/S1ENwy59).

Seamlessly connects LLMs (Claude Desktop, Cursor, Zed, Claude Code, Goose, etc.) to global bird observation data, checklists, birding hotspots, and avian taxonomy.

---

## Highlights

- **Complete API Coverage (25 Core Endpoints)**: Full coverage of all documented eBird v2 REST services across observations, hotspots, products, and references.
- **AI Helper Tools**: Built-in fuzzy species search (`ebird_search_species`), hotspot search (`ebird_search_hotspots`), and region code exploration (`ebird_lookup_region`) so models can resolve 6-letter species codes and region identifiers instantly without guessing.
- **Environment-First Authentication**: Automatically detects and uses `EBIRD_API_KEY` from environment variables, `.env`, or shell profiles (`~/.zshrc`, `~/.bashrc`). LLMs can invoke tools without needing to pass or know the API key.
- **MCP Resources**: Exposes system metadata, taxonomy versions, and supported locales via `ebird://` URI resources.
- **MCP Prompts**: Pre-configured prompt templates for finding rare birds, planning birding trips, and tracking target species.
- **Dual Transport**: Supports standard **stdio** for local desktop clients and **Streamable HTTP** for remote/edge deployments (including Cloudflare Workers).

---

## Quick Start

### 1. Obtain a Free eBird API Key

If you don't already have an eBird API key, request one for free at [ebird.org/api/keygen](https://ebird.org/api/keygen).

### 2. Configure Your Client

#### Claude Desktop

Add `ebird` to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ebird": {
      "command": "node",
      "args": ["/path/to/ebird-mcp/bin/ebird-mcp.js"],
      "env": {
        "EBIRD_API_KEY": "YOUR_EBIRD_API_TOKEN"
      }
    }
  }
}
```

Or run directly with `npx` once published:

```json
{
  "mcpServers": {
    "ebird": {
      "command": "npx",
      "args": ["-y", "ebird-mcp"],
      "env": {
        "EBIRD_API_KEY": "YOUR_EBIRD_API_TOKEN"
      }
    }
  }
}
```

#### Cursor

In `.cursor/mcp.json` or Cursor Settings > Features > MCP:

```json
{
  "mcpServers": {
    "ebird": {
      "command": "node",
      "args": ["/path/to/ebird-mcp/bin/ebird-mcp.js"],
      "env": {
        "EBIRD_API_KEY": "YOUR_EBIRD_API_TOKEN"
      }
    }
  }
}
```

#### Claude Code (CLI)

```bash
claude mcp add ebird -- node /path/to/ebird-mcp/bin/ebird-mcp.js
```

---

## Tool Catalog (28 Tools)

### AI Helper Tools

| Tool                    | Description                                                                             | Key Arguments                                       |
| ----------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `ebird_search_species`  | Search species by common name, scientific name, or code (e.g. "Snowy Owl" -> `snoowl1`) | `query`, `category`, `maxResults`                   |
| `ebird_search_hotspots` | Search hotspots by region code or coordinates with keyword name matching                | `regionCode`, `lat`, `lng`, `dist`, `query`, `back` |
| `ebird_lookup_region`   | Explore and search country, state, and county region codes                              | `regionType`, `parentRegionCode`, `query`           |

### Observation Tools

| Tool                                    | Endpoint                                          | Description                                           |
| --------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `ebird_data_obs_recent`                 | `GET /data/obs/{regionCode}/recent`               | Recent sightings in a country, state, or county       |
| `ebird_data_obs_recent_notable`         | `GET /data/obs/{regionCode}/recent/notable`       | Recent rare/notable sightings in a region             |
| `ebird_data_obs_recent_species`         | `GET /data/obs/{regionCode}/recent/{speciesCode}` | Recent observations of a specific species in a region |
| `ebird_data_obs_geo_recent`             | `GET /data/obs/geo/recent`                        | Recent observations near coordinates (lat/lng)        |
| `ebird_data_obs_geo_recent_species`     | `GET /data/obs/geo/recent/{speciesCode}`          | Recent observations of a species near coordinates     |
| `ebird_data_nearest_geo_recent_species` | `GET /data/nearest/geo/recent/{speciesCode}`      | Nearest recent sightings of a species to coordinates  |
| `ebird_data_obs_geo_recent_notable`     | `GET /data/obs/geo/recent/notable`                | Recent notable/rare observations near coordinates     |
| `ebird_data_obs_historic`               | `GET /data/obs/{regionCode}/historic/{y}/{m}/{d}` | Historical sightings in a region on a specific date   |

### Checklist & Product Tools

| Tool                           | Endpoint                                       | Description                                                   |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------- |
| `ebird_product_top100`         | `GET /product/top100/{regionCode}/{y}/{m}/{d}` | Leaderboard of top observers in a region on a date            |
| `ebird_product_lists`          | `GET /product/lists/{regionCode}`              | Recent checklist feed for a region                            |
| `ebird_product_lists_by_date`  | `GET /product/lists/{regionCode}/{y}/{m}/{d}`  | Checklists submitted for a region on a given date             |
| `ebird_product_stats`          | `GET /product/stats/{regionCode}/{y}/{m}/{d}`  | Observation count and species statistics on a date            |
| `ebird_product_spplist`        | `GET /product/spplist/{regionCode}`            | Complete historical species list for a region                 |
| `ebird_product_checklist_view` | `GET /product/checklist/view/{subId}`          | Full checklist details and observation notes by submission ID |

### Reference & Hotspot Tools

| Tool                           | Endpoint                                               | Description                                         |
| ------------------------------ | ------------------------------------------------------ | --------------------------------------------------- |
| `ebird_ref_hotspot`            | `GET /ref/hotspot/{regionCode}`                        | All hotspots in a region                            |
| `ebird_ref_hotspot_geo`        | `GET /ref/hotspot/geo`                                 | Hotspots within radius of coordinates               |
| `ebird_ref_hotspot_info`       | `GET /ref/hotspot/info/{locId}`                        | Hotspot metadata (name, coordinates, species count) |
| `ebird_ref_adjacent`           | `GET /ref/adjacent/{regionCode}`                       | Adjacent / neighboring region codes                 |
| `ebird_ref_region_info`        | `GET /ref/region/info/{regionCode}`                    | Region name and geographic boundary coordinates     |
| `ebird_ref_region_list`        | `GET /ref/region/list/{regionType}/{parentRegionCode}` | Sub-region list (countries, states, counties)       |
| `ebird_ref_taxonomy`           | `GET /ref/taxonomy/ebird`                              | Official eBird / Clements taxonomy snapshot         |
| `ebird_ref_taxon_forms`        | `GET /ref/taxon/forms/{speciesCode}`                   | Subspecies and taxonomic forms of a species         |
| `ebird_ref_taxa_locales_ebird` | `GET /ref/taxa-locales/ebird`                          | Supported language codes for localized bird names   |
| `ebird_ref_taxonomy_versions`  | `GET /ref/taxonomy/versions`                           | List of taxonomy versions and release dates         |
| `ebird_ref_sppgroup`           | `GET /ref/sppgroup/{speciesGrouping}`                  | Taxonomic groupings (e.g. Merlin groups)            |

---

## MCP Resources

| URI                         | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `ebird://server-info`       | Server status, version, auth state, and capability metadata |
| `ebird://taxonomy/versions` | Supported eBird taxonomy versions                           |
| `ebird://locales`           | Language codes available for localized common names         |

---

## MCP Prompts

| Prompt              | Description                                                | Arguments               |
| ------------------- | ---------------------------------------------------------- | ----------------------- |
| `find-rare-birds`   | Locates and reports notable bird sightings in an area      | `regionCode`, `back`    |
| `plan-birding-trip` | Plans a birding trip with top hotspots and target species  | `location`, `duration`  |
| `species-tracker`   | Resolves bird names and tracks recent observation activity | `species`, `regionCode` |

---

## Local Development

```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Run full test suite (Vitest)
npm run test

# Type-check
npm run typecheck

# Format code (Prettier)
npm run format

# Run stdio server manually
npm run mcp:stdio
```

---

## Security & Privacy

- **Stateless & Local**: Runs entirely on your machine. No user telemetry, sightings data, or tokens are transmitted to any third party other than Cornell Lab's official eBird API.
- **Sanitized Errors**: API tokens are never reflected in error messages, logs, or response objects.
- **HTTPS Only**: All outgoing requests to `api.ebird.org` use HTTPS.

---

## License

MIT

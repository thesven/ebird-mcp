# Changelog

All notable changes to `ebird-mcp` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-11-11

### Added

- add typed library exports, community health templates, multi-node CI, and >90% coverage suite (`d7fed81`)

## [1.2.0] - 2026-11-11

### Added

- add automated semver release pipeline, packaging metadata, and valid project docs (`994b70d`)
- add AI helper tools, MCP resources, prompts, env auth, and CLI executable (`7aaa669`)
- add local stdio MCP launcher (`f51785e`)
- apply endpoint defaults and support csv responses (`ae6bbb0`)
- scaffold and implement Cloudflare-hosted eBird MCP server (`7276b89`)

### Documentation & Maintenance

- update dependencies to latest versions and configure tooling (`e53744f`)
- pivot to local-first MCP (`046646f`)

## [1.1.0] - 2026-11-11

### Added

- **AI Helper Tools (3 New Tools)**:
  - `ebird_search_species`: Fast, in-memory fuzzy search resolving common names (e.g. "Snowy Owl"), scientific names, or banding codes to eBird's 6-letter `speciesCode`.
  - `ebird_search_hotspots`: Birding hotspot search by region code or lat/long coordinates with keyword name matching and observation metrics.
  - `ebird_lookup_region`: Structured country, state/province (`subnational1`), and county (`subnational2`) region code exploration.
- **Environment-First Authentication**:
  - Auto-discovery of `EBIRD_API_KEY` from process environment, `.env`, or shell profiles (`~/.zshrc`, `~/.bashrc`).
  - `apiKey` is now optional across all tool schemas, enabling LLMs to call tools seamlessly without needing to pass credentials in chat.
- **MCP Resources**:
  - `ebird://server-info`: Real-time system health, auth status, and tool catalog metadata.
  - `ebird://taxonomy/versions`: Active and historical eBird taxonomy releases.
  - `ebird://locales`: Supported locale codes for localized bird common names.
- **MCP Prompts**:
  - `find-rare-birds`: Interactive template for locating rare and notable sightings in a target region.
  - `plan-birding-trip`: Generates custom birding itineraries with top hotspots and target species.
  - `species-tracker`: Resolves bird names and tracks recent sighting activity across regions.
- **Packaging & CLI**:
  - Added executable CLI `bin/ebird-mcp.js` and npm `bin` definition for 1-click `npx ebird-mcp` execution.
  - Added automated Semantic Release & Publish GitHub Actions pipeline (`.github/workflows/release.yml`).
  - Added `CONTRIBUTING.md` and MIT `LICENSE`.

### Changed & Improved

- Upgraded all dependencies to latest:
  - `@modelcontextprotocol/sdk` to `^1.32.2`
  - `zod` to `^4.6.7`
  - `typescript` to `^7.0.2`
  - `vitest` to `^5.1.0`
  - `wrangler` to `^4.160.0`
  - `@types/node` to `^26.6.6`
- Added rich `.describe(...)` parameter documentation across all Zod query schemas.
- Corrected Cloudflare Worker entry point in `wrangler.toml` (`dist/src/index.js`).
- Added Prettier code formatting with `.prettierrc` and `.prettierignore`.
- Expanded test suite from 7 to 34 unit and integration tests across 4 test suites.

## [1.0.0] - 2026-08-19

### Added

- Initial scaffold and implementation of local-first eBird MCP server for 25 eBird v2 endpoints.
- Stdio server launcher (`scripts/ebird-mcp-stdio.mjs`).
- Cloudflare Worker HTTP transport (`src/index.ts`).

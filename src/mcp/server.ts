import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callEbirdEndpoint, endpointByName, toolDefinitions } from '../ebird/client.js';
import { apiKeySchema } from '../ebird/schema.js';
import {
  searchSpecies,
  searchHotspots,
  lookupRegions,
  SearchSpeciesOptions,
  SearchHotspotsOptions,
  LookupRegionsOptions,
} from '../ebird/helpers.js';

export interface ServerOptions {
  name?: string;
  version?: string;
}

export function createServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer(
    {
      name: options.name || 'ebird-mcp',
      version: options.version || '1.2.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  // 1. Register all core eBird v2 REST tools (25 tools)
  for (const tool of toolDefinitions()) {
    const inputObject = z.object(tool.inputSchema as z.ZodRawShape);

    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: inputObject,
      },
      async (rawArgs: z.infer<typeof inputObject>) => {
        const endpointName = tool.name.replace(/^ebird_/, '');
        const def = endpointByName[endpointName];
        if (!def) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${tool.name}` }],
          };
        }

        try {
          const data = await callEbirdEndpoint(endpointName, rawArgs as Record<string, unknown>);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: message,
              },
            ],
          };
        }
      },
    );
  }

  // 2. Register high-value AI helper tools

  // Helper 1: ebird_search_species
  const searchSpeciesSchema = z.object({
    query: z
      .string()
      .trim()
      .min(1)
      .describe(
        "Search term for bird species: common name (e.g. 'Snowy Owl', 'Peregrine Falcon'), scientific name (e.g. 'Bubo scandiacus'), or 6-letter species code ('snoowl1')",
      ),
    category: z
      .string()
      .trim()
      .optional()
      .describe("Optional category filter (default: 'species', or 'all')"),
    maxResults: z.coerce
      .number()
      .int()
      .positive()
      .max(50)
      .optional()
      .describe('Max number of matches to return (1-50, default 10)'),
  });

  server.registerTool(
    'ebird_search_species',
    {
      title: 'Search Bird Species and Codes',
      description:
        'Search bird species by common name, scientific name, or code. Returns species code (speciesCode) required by observation and checklist tools, along with taxonomic information.',
      inputSchema: searchSpeciesSchema,
    },
    async (args: z.infer<typeof searchSpeciesSchema>) => {
      try {
        const results = await searchSpecies(args.query, args as SearchSpeciesOptions);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: 'text', text: `Species search error: ${message}` }],
        };
      }
    },
  );

  // Helper 2: ebird_search_hotspots
  const searchHotspotsSchema = z.object({
    regionCode: z
      .string()
      .trim()
      .optional()
      .describe("eBird region code to search within (e.g. 'US-NY', 'US-CA-001')"),
    lat: z.coerce
      .number()
      .min(-90)
      .max(90)
      .optional()
      .describe('Latitude for coordinate-based hotspot search'),
    lng: z.coerce
      .number()
      .min(-180)
      .max(180)
      .optional()
      .describe('Longitude for coordinate-based hotspot search'),
    dist: z.coerce
      .number()
      .min(0)
      .max(500)
      .optional()
      .describe('Search radius in km from coordinates (0-50 km, default 25 km)'),
    query: z
      .string()
      .trim()
      .optional()
      .describe(
        "Optional name keyword match to filter hotspots (e.g. 'Park', 'Reservoir', 'Woods')",
      ),
    back: z.coerce
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe('Number of days back for recent observation activity (1-30)'),
    maxResults: z.coerce
      .number()
      .int()
      .positive()
      .max(200)
      .optional()
      .describe('Max number of hotspots to return (default 20)'),
    apiKey: apiKeySchema,
  });

  server.registerTool(
    'ebird_search_hotspots',
    {
      title: 'Search Birding Hotspots',
      description:
        'Find birding hotspots by region or coordinates with optional keyword filtering. Returns location IDs (locId) and observation statistics.',
      inputSchema: searchHotspotsSchema,
    },
    async (args: z.infer<typeof searchHotspotsSchema>) => {
      try {
        const results = await searchHotspots(args as SearchHotspotsOptions);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: 'text', text: `Hotspot search error: ${message}` }],
        };
      }
    },
  );

  // Helper 3: ebird_lookup_region
  const lookupRegionSchema = z.object({
    regionType: z
      .enum(['country', 'subnational1', 'subnational2'])
      .describe(
        "Region level: 'country' (list countries), 'subnational1' (states/provinces), or 'subnational2' (counties)",
      ),
    parentRegionCode: z
      .string()
      .trim()
      .min(1)
      .describe(
        "Parent region code: 'world' for countries, country code (e.g. 'US', 'CA') for states/provinces, or state code (e.g. 'US-NY') for counties",
      ),
    query: z
      .string()
      .trim()
      .optional()
      .describe("Optional search filter for region code or name (e.g. 'York', 'Suffolk')"),
    maxResults: z.coerce
      .number()
      .int()
      .positive()
      .max(200)
      .optional()
      .describe('Max number of subregions to return (default 50)'),
    apiKey: apiKeySchema,
  });

  server.registerTool(
    'ebird_lookup_region',
    {
      title: 'Lookup Region Codes',
      description:
        'Lookup and filter eBird region codes (countries, states/provinces, counties) for use in observation and checklist tools.',
      inputSchema: lookupRegionSchema,
    },
    async (args: z.infer<typeof lookupRegionSchema>) => {
      try {
        const results = await lookupRegions(args as LookupRegionsOptions);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: 'text', text: `Region lookup error: ${message}` }],
        };
      }
    },
  );

  // 3. Register MCP Resources
  server.registerResource(
    'server-info',
    'ebird://server-info',
    {
      title: 'eBird MCP Server Status and Capabilities',
      description: 'System health, auth configuration status, and tool catalog metadata',
      mimeType: 'application/json',
    },
    async (uri) => {
      const isAuthSet = Boolean(process.env.EBIRD_API_KEY && process.env.EBIRD_API_KEY.trim());
      const info = {
        name: options.name || 'ebird-mcp',
        version: options.version || '1.3.0',
        authStatus: {
          apiKeyConfigured: isAuthSet,
          note: isAuthSet
            ? 'EBIRD_API_KEY is configured in the environment'
            : 'EBIRD_API_KEY is not set in environment; tools requiring authentication will require apiKey parameter',
        },
        toolsCount: 28,
        capabilities: ['tools', 'resources', 'prompts'],
        endpointsSupported: 25,
        helperTools: ['ebird_search_species', 'ebird_search_hotspots', 'ebird_lookup_region'],
      };

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(info, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    },
  );

  server.registerResource(
    'taxonomy-versions',
    'ebird://taxonomy/versions',
    {
      title: 'Available eBird Taxonomy Versions',
      description: 'Historical and current eBird taxonomy versions',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const data = await callEbirdEndpoint('ref_taxonomy_versions', {});
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(data, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ error: message }),
              mimeType: 'application/json',
            },
          ],
        };
      }
    },
  );

  server.registerResource(
    'locales',
    'ebird://locales',
    {
      title: 'Supported Common Name Locales',
      description: 'List of language codes supported by eBird for localized bird common names',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const data = await callEbirdEndpoint('ref_taxa_locales_ebird', {});
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(data, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ error: message }),
              mimeType: 'application/json',
            },
          ],
        };
      }
    },
  );

  // 4. Register MCP Prompts
  server.registerPrompt(
    'find-rare-birds',
    {
      title: 'Find Rare & Notable Birds',
      description: 'Template for locating rare and notable bird observations in a target region',
      argsSchema: {
        regionCode: z
          .string()
          .describe("eBird region code to search (e.g. 'US-NY', 'US-CA', 'US-TX-453')"),
        back: z.string().optional().describe('Number of days back to look (default: 14)'),
      },
    },
    async (args) => {
      const backDays = args.back || '14';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please find recent notable bird observations in region "${args.regionCode}" over the past ${backDays} days using ebird_data_obs_recent_notable. For each sighting, summarize the species name, observation date, location/hotspot, count, and any observer notes on rarity. Highlight species that are unusually rare for this time of year.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'plan-birding-trip',
    {
      title: 'Plan a Birding Trip',
      description:
        'Generate a birding excursion itinerary with top hotspots, target species, and recent sightings',
      argsSchema: {
        location: z
          .string()
          .describe("Destination region code (e.g. 'US-CO') or latitude,longitude coordinates"),
        duration: z
          .string()
          .optional()
          .describe("Trip duration or style (e.g. 'morning', '1 day', 'weekend')"),
      },
    },
    async (args) => {
      const duration = args.duration || '1 day';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I am planning a ${duration} birding trip to "${args.location}". Please:
1. Search top birding hotspots in the area using ebird_search_hotspots or ebird_ref_hotspot.
2. Check the most recent sightings and top species in the region using ebird_data_obs_recent.
3. Suggest an optimal birding itinerary, including which hotspots to visit at what times of day and what target species to watch for.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'species-tracker',
    {
      title: 'Track a Bird Species',
      description: 'Find recent sightings and locations for a specific bird species',
      argsSchema: {
        species: z
          .string()
          .describe("Bird species common name (e.g. 'Snowy Owl') or 6-letter code ('snoowl1')"),
        regionCode: z.string().describe("Region code to search within (e.g. 'US-MA')"),
      },
    },
    async (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to track sightings of "${args.species}" in region "${args.regionCode}".
1. If "${args.species}" is not an eBird species code, first resolve its species code using ebird_search_species.
2. Query recent sightings of that species in "${args.regionCode}" using ebird_data_obs_recent_species.
3. Report the most recent locations, dates, counts, and whether any observations occurred at official hotspots.`,
            },
          },
        ],
      };
    },
  );

  return server;
}

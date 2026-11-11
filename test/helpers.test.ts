import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchSpecies,
  searchHotspots,
  lookupRegions,
  getTaxonomy,
  setTaxonomyCacheForTesting,
} from '../src/ebird/helpers.js';

describe('eBird helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setTaxonomyCacheForTesting([
      {
        speciesCode: 'snoowl1',
        comName: 'Snowy Owl',
        sciName: 'Bubo scandiacus',
        category: 'species',
        order: 'Strigiformes',
        familyComName: 'Owls',
        familySciName: 'Strigidae',
        bandingCodes: ['SNOW'],
      },
      {
        speciesCode: 'baleag',
        comName: 'Bald Eagle',
        sciName: 'Haliaeetus leucocephalus',
        category: 'species',
        order: 'Accipitriformes',
        familyComName: 'Hawks, Eagles, and Kites',
        familySciName: 'Accipitridae',
        bandingCodes: ['BAEA'],
      },
      {
        speciesCode: 'cangoo',
        comName: 'Canada Goose',
        sciName: 'Branta canadensis',
        category: 'species',
        order: 'Anseriformes',
        familyComName: 'Ducks, Geese, and Waterfowl',
        familySciName: 'Anatidae',
        bandingCodes: ['CAGO'],
      },
    ]);
  });

  afterEach(() => {
    setTaxonomyCacheForTesting(null);
    vi.restoreAllMocks();
  });

  describe('getTaxonomy', () => {
    it('fetches taxonomy from remote endpoint when cache is null', async () => {
      setTaxonomyCacheForTesting(null);
      global.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify([
            {
              speciesCode: 'osprey',
              comName: 'Osprey',
              sciName: 'Pandion haliaetus',
              category: 'species',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      });

      const taxa = await getTaxonomy();
      expect(taxa.length).toBe(1);
      expect(taxa[0].speciesCode).toBe('osprey');
    });

    it('returns empty array if remote returns non-array', async () => {
      setTaxonomyCacheForTesting(null);
      global.fetch = vi.fn(async () => {
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

      const taxa = await getTaxonomy();
      expect(taxa).toEqual([]);
    });
  });

  describe('searchSpecies', () => {
    it('returns empty array for empty query', async () => {
      const res = await searchSpecies('');
      expect(res).toEqual([]);
    });

    it('finds species by common name', async () => {
      const res = await searchSpecies('Snowy Owl');
      expect(res.length).toBe(1);
      expect(res[0].speciesCode).toBe('snoowl1');
      expect(res[0].comName).toBe('Snowy Owl');
    });

    it('finds species by prefix of common name', async () => {
      const res = await searchSpecies('Snow');
      expect(res.length).toBe(1);
      expect(res[0].speciesCode).toBe('snoowl1');
    });

    it('finds species by word inside common name', async () => {
      const res = await searchSpecies('Eagle');
      expect(res.length).toBe(1);
      expect(res[0].comName).toBe('Bald Eagle');
    });

    it('finds species by scientific name prefix and substring', async () => {
      const res1 = await searchSpecies('Haliaeetus');
      expect(res1[0].speciesCode).toBe('baleag');

      const res2 = await searchSpecies('scandiacus');
      expect(res2[0].speciesCode).toBe('snoowl1');
    });

    it('finds species by partial species code', async () => {
      const res = await searchSpecies('owl1');
      expect(res.length).toBe(1);
      expect(res[0].speciesCode).toBe('snoowl1');
    });

    it('finds species by species code or banding code', async () => {
      const res1 = await searchSpecies('baleag');
      expect(res1[0].comName).toBe('Bald Eagle');

      const res2 = await searchSpecies('BAEA');
      expect(res2[0].comName).toBe('Bald Eagle');
    });

    it('filters by category when specified', async () => {
      const res = await searchSpecies('Snowy Owl', { category: 'hybrid' });
      expect(res).toEqual([]);
    });

    it('respects maxResults option', async () => {
      const res = await searchSpecies('a', { maxResults: 1 });
      expect(res.length).toBe(1);
    });
  });

  describe('searchHotspots', () => {
    it('throws when neither regionCode nor coordinates are given', async () => {
      await expect(searchHotspots({})).rejects.toThrow(/Either 'regionCode'/);
    });

    it('returns empty array if endpoint returns non-array', async () => {
      global.fetch = vi.fn(async () => {
        return new Response(JSON.stringify({ error: 'fail' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

      const res = await searchHotspots({ regionCode: 'US-NY', apiKey: 'test-key' });
      expect(res).toEqual([]);
    });

    it('searches hotspots by regionCode and filters by query', async () => {
      global.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify([
            { locId: 'L101', locName: 'Central Park - The Ramble', lat: 40.78, lng: -73.97 },
            { locId: 'L102', locName: 'Prospect Park', lat: 40.66, lng: -73.96 },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      });

      const res = await searchHotspots({
        regionCode: 'US-NY',
        query: 'Central Park',
        apiKey: 'test-key',
      });
      expect(res.length).toBe(1);
      expect(res[0].locId).toBe('L101');
      expect(res[0].locName).toBe('Central Park - The Ramble');
    });

    it('searches hotspots by coordinates (lat, lng)', async () => {
      global.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify([{ locId: 'L201', locName: 'Boston Common', lat: 42.35, lng: -71.06 }]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      });

      const res = await searchHotspots({
        lat: 42.35,
        lng: -71.06,
        apiKey: 'test-key',
      });
      expect(res.length).toBe(1);
      expect(res[0].locId).toBe('L201');
    });
  });

  describe('lookupRegions', () => {
    it('lists regions and filters by query', async () => {
      global.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify([
            { code: 'US-NY', name: 'New York' },
            { code: 'US-NJ', name: 'New Jersey' },
            { code: 'US-CA', name: 'California' },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      });

      const res = await lookupRegions({
        regionType: 'subnational1',
        parentRegionCode: 'US',
        query: 'New',
        apiKey: 'test-key',
      });

      expect(res.length).toBe(2);
      expect(res[0].code).toBe('US-NY');
      expect(res[1].code).toBe('US-NJ');
    });

    it('returns empty array if remote returns non-array', async () => {
      global.fetch = vi.fn(async () => {
        return new Response(JSON.stringify({ error: 'fail' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

      const res = await lookupRegions({
        regionType: 'country',
        parentRegionCode: 'world',
        apiKey: 'test-key',
      });
      expect(res).toEqual([]);
    });
  });
});

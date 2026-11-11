import * as z from 'zod';

export const apiKeySchema = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    'eBird API token. Optional if the EBIRD_API_KEY environment variable is configured on the server.',
  );

export const apiKeyRequired = apiKeySchema;

export const apiKeyField = {
  apiKey: apiKeySchema,
};

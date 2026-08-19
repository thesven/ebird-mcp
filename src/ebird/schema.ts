import * as z from 'zod';

export const apiKeyRequired = z.string().trim().min(1, 'apiKey is required');

export const apiKeyField = {
  apiKey: apiKeyRequired,
};

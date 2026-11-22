import { z } from 'zod';

export const TRACK_SEARCH_DEFAULT_LIMIT = 20;
export const TRACK_SEARCH_MAX_LIMIT = 50;

export const trackSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    artist: z.string(),
    album: z.string().nullable(),
    durationMs: z.number().int().positive().describe('Track length in milliseconds'),
    coverUrl: z.string().url().nullable().describe('Public URL of the cover image, null if none'),
    license: z.string().nullable().describe('License of the audio file, e.g. CC-BY 4.0'),
    attribution: z
      .string()
      .nullable()
      .describe('Credit line to display when the license requires it (CC-BY)'),
  })
  .describe('Catalog track');

export const trackPageSchema = z
  .object({
    items: z.array(trackSchema),
    total: z.number().int().nonnegative().describe('Number of tracks matching the search'),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  })
  .describe('One page of catalog tracks');

export const trackSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Part of the title, artist or album, case-insensitive. Omit to browse the catalog'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(TRACK_SEARCH_MAX_LIMIT)
    .default(TRACK_SEARCH_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export const trackIdParamsSchema = z.object({
  id: z.string().uuid().describe('Track id'),
});

export const trackStreamSchema = z
  .object({
    url: z
      .string()
      .url()
      .describe('Signed URL of the MP3 file. Supports HTTP Range requests for seeking'),
    expiresAt: z
      .string()
      .datetime()
      .describe('After this date the URL stops working: ask for a new one'),
  })
  .describe('Short-lived link to play the full track');

export type TrackView = z.infer<typeof trackSchema>;
export type TrackPage = z.infer<typeof trackPageSchema>;
export type TrackSearchQuery = z.infer<typeof trackSearchQuerySchema>;
export type TrackIdParams = z.infer<typeof trackIdParamsSchema>;
export type TrackStream = z.infer<typeof trackStreamSchema>;

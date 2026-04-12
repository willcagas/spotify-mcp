import { z } from "zod";

export const searchSchema = {
  query: z.string().min(1).describe("Search query string"),
  types: z
    .array(
      z.enum([
        "artist",
        "track",
        "album",
        "playlist",
        "show",
        "episode",
        "audiobook",
      ]),
    )
    .min(1)
    .describe("Content types to search for"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Max results per type (default: 5, max: 10 per Feb 2026 API limits)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Index of first result to return (default: 0)"),
  market: z
    .string()
    .length(2)
    .optional()
    .describe("ISO 3166-1 alpha-2 country code (e.g., 'US')"),
};

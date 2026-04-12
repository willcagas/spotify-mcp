import { z } from "zod";

export const getTopItemsSchema = {
  time_range: z
    .enum(["short_term", "medium_term", "long_term"])
    .optional()
    .describe(
      "Time range: 'short_term' (~4 weeks), 'medium_term' (~6 months, default), 'long_term' (all time)",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of items to return (default: 20, max: 50)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Index of first item to return (default: 0)"),
};

export const getRecentlyPlayedSchema = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of items to return (default: 20, max: 50)"),
  after: z
    .number()
    .optional()
    .describe("Unix timestamp in milliseconds. Returns items played after this timestamp."),
  before: z
    .number()
    .optional()
    .describe("Unix timestamp in milliseconds. Returns items played before this timestamp."),
};

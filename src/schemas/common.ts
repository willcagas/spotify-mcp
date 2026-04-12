import { z } from "zod";

export const spotifyId = z
  .string()
  .min(1)
  .describe("Spotify ID (the alphanumeric string from a Spotify URI or URL)");

export const spotifyUri = z
  .string()
  .regex(
    /^spotify:(track|album|artist|playlist|show|episode|audiobook|chapter|user):[a-zA-Z0-9]+$/,
  )
  .describe("Spotify URI (e.g., spotify:track:6rqhFgbbKwnb9MLmUQDhG6)");

export const deviceId = z
  .string()
  .optional()
  .describe(
    "Target device ID. If not supplied, the currently active device is used.",
  );

export const paginationParams = {
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
    .describe("Index of the first item to return (default: 0)"),
};

export const market = z
  .string()
  .length(2)
  .optional()
  .describe("ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')");

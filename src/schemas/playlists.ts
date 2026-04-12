import { z } from "zod";
import { spotifyId, market, paginationParams } from "./common.js";

export const getPlaylistSchema = {
  id: spotifyId.describe("Spotify playlist ID"),
  market: market,
};

export const getPlaylistItemsSchema = {
  id: spotifyId.describe("Spotify playlist ID"),
  ...paginationParams,
  market: market,
};

export const createPlaylistSchema = {
  name: z.string().min(1).describe("Name for the new playlist"),
  description: z.string().optional().describe("Playlist description"),
  public: z.boolean().optional().describe("Whether the playlist is public (default: true)"),
  collaborative: z
    .boolean()
    .optional()
    .describe("Whether the playlist is collaborative (default: false). Must be non-public to be collaborative."),
};

export const updatePlaylistSchema = {
  id: spotifyId.describe("Spotify playlist ID"),
  name: z.string().optional().describe("New name for the playlist"),
  description: z.string().optional().describe("New description for the playlist"),
  public: z.boolean().optional().describe("Whether the playlist is public"),
  collaborative: z.boolean().optional().describe("Whether the playlist is collaborative"),
};

export const addPlaylistItemsSchema = {
  id: spotifyId.describe("Spotify playlist ID"),
  uris: z
    .array(z.string())
    .min(1)
    .max(100)
    .describe("Array of Spotify URIs to add (max 100). Example: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh']"),
  position: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-based position to insert items (default: append to end)"),
};

export const removePlaylistItemsSchema = {
  id: spotifyId.describe("Spotify playlist ID"),
  uris: z
    .array(z.string())
    .min(1)
    .max(100)
    .describe("Array of Spotify URIs to remove (max 100)"),
  snapshot_id: z
    .string()
    .optional()
    .describe("Playlist snapshot ID for concurrency safety"),
};

export const reorderPlaylistItemsSchema = {
  id: spotifyId.describe("Spotify playlist ID"),
  range_start: z.number().int().min(0).describe("Position of first item to reorder"),
  insert_before: z
    .number()
    .int()
    .min(0)
    .describe("Position to insert items before"),
  range_length: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Number of items to reorder (default: 1)"),
  snapshot_id: z.string().optional().describe("Playlist snapshot ID for concurrency safety"),
};

export const getMyPlaylistsSchema = {
  ...paginationParams,
};

export const getPlaylistCoverSchema = {
  id: spotifyId.describe("Spotify playlist ID"),
};

export const uploadPlaylistCoverSchema = {
  id: spotifyId.describe("Spotify playlist ID"),
  image_base64: z
    .string()
    .describe("Base64-encoded JPEG image data (max 256KB). Do not include data URI prefix."),
};

import { z } from "zod";
import { paginationParams } from "./common.js";

export const addToLibrarySchema = {
  uris: z
    .array(z.string())
    .min(1)
    .max(50)
    .describe(
      "Array of Spotify URIs to save. Supports all types: tracks, albums, episodes, shows, audiobooks, artists, users, playlists. " +
        "Example: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh', 'spotify:artist:0OdUWJ0sBjDrqHygGUXeCF']",
    ),
};

export const removeFromLibrarySchema = {
  uris: z
    .array(z.string())
    .min(1)
    .max(50)
    .describe(
      "Array of Spotify URIs to remove. Supports all types: tracks, albums, episodes, shows, audiobooks, artists, users, playlists.",
    ),
};

export const checkLibrarySchema = {
  uris: z
    .array(z.string())
    .min(1)
    .max(50)
    .describe(
      "Array of Spotify URIs to check. Supports all types: tracks, albums, episodes, shows, audiobooks, artists, users, playlists.",
    ),
};

export const getMyTracksSchema = { ...paginationParams };
export const getMyAlbumsSchema = { ...paginationParams };
export const getMyShowsSchema = { ...paginationParams };
export const getMyEpisodesSchema = { ...paginationParams };
export const getMyAudiobooksSchema = { ...paginationParams };

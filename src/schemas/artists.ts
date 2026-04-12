import { z } from "zod";
import { spotifyId, market, paginationParams } from "./common.js";

export const getArtistSchema = {
  id: spotifyId.describe("Spotify artist ID"),
};

export const getArtistAlbumsSchema = {
  id: spotifyId.describe("Spotify artist ID"),
  include_groups: z
    .array(z.enum(["album", "single", "appears_on", "compilation"]))
    .optional()
    .describe("Filter by album type"),
  ...paginationParams,
  market: market,
};

export const getRelatedArtistsSchema = {
  id: spotifyId.describe("Spotify artist ID"),
};

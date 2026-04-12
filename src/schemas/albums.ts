import { z } from "zod";
import { spotifyId, market, paginationParams } from "./common.js";

export const getAlbumSchema = {
  id: spotifyId.describe("Spotify album ID"),
  market: market,
};

export const getAlbumTracksSchema = {
  id: spotifyId.describe("Spotify album ID"),
  ...paginationParams,
  market: market,
};

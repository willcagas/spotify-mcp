import { z } from "zod";
import { spotifyId, market, paginationParams } from "./common.js";

export const getShowSchema = {
  id: spotifyId.describe("Spotify show ID"),
  market: market,
};

export const getShowEpisodesSchema = {
  id: spotifyId.describe("Spotify show ID"),
  ...paginationParams,
  market: market,
};

export const getEpisodeSchema = {
  id: spotifyId.describe("Spotify episode ID"),
  market: market,
};

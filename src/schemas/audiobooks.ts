import { z } from "zod";
import { spotifyId, market, paginationParams } from "./common.js";

export const getAudiobookSchema = {
  id: spotifyId.describe("Spotify audiobook ID"),
  market: market,
};

export const getAudiobookChaptersSchema = {
  id: spotifyId.describe("Spotify audiobook ID"),
  ...paginationParams,
  market: market,
};

export const getChapterSchema = {
  id: spotifyId.describe("Spotify chapter ID"),
  market: market,
};

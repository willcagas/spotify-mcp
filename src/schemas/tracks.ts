import { z } from "zod";
import { spotifyId, market } from "./common.js";

export const getTrackSchema = {
  id: spotifyId.describe("Spotify track ID"),
  market: market,
};

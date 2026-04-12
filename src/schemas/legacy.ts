import { z } from "zod";
import { spotifyId } from "./common.js";

export const getAudioFeaturesSchema = {
  id: spotifyId.describe("Spotify track ID"),
};

export const getAudioAnalysisSchema = {
  id: spotifyId.describe("Spotify track ID"),
};

import { z } from "zod";
import { market } from "./common.js";

export const getRecommendationsSchema = {
  seed_artists: z
    .array(z.string())
    .optional()
    .describe("Array of Spotify artist IDs for seeding recommendations (up to 5 total seeds)"),
  seed_tracks: z
    .array(z.string())
    .optional()
    .describe("Array of Spotify track IDs for seeding recommendations (up to 5 total seeds)"),
  seed_genres: z
    .array(z.string())
    .optional()
    .describe("Array of genre names for seeding recommendations (up to 5 total seeds). Use spotify_get_genre_seeds to get valid values."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of recommendations (default: 20, max: 100)"),
  market: market,
  // Tunable attributes
  target_energy: z.number().min(0).max(1).optional().describe("Target energy (0.0-1.0)"),
  target_danceability: z.number().min(0).max(1).optional().describe("Target danceability (0.0-1.0)"),
  target_valence: z.number().min(0).max(1).optional().describe("Target valence/positivity (0.0-1.0)"),
  target_tempo: z.number().optional().describe("Target tempo in BPM"),
  target_acousticness: z.number().min(0).max(1).optional().describe("Target acousticness (0.0-1.0)"),
  target_instrumentalness: z.number().min(0).max(1).optional().describe("Target instrumentalness (0.0-1.0)"),
  target_liveness: z.number().min(0).max(1).optional().describe("Target liveness (0.0-1.0)"),
  target_speechiness: z.number().min(0).max(1).optional().describe("Target speechiness (0.0-1.0)"),
};

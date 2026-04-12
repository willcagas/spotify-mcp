import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getRecommendationsSchema } from "../schemas/recommendations.js";
import type { SpotifyRecommendations } from "../types.js";
import { textContent, formatTrack } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

const DEPRECATED_NOTE =
  " [DEPRECATED] This endpoint returns 403 for apps created after Nov 27, 2024. " +
  "Only works for grandfathered apps with extended-mode access.";

export function registerRecommendationTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_recommendations",
    {
      title: "Get Recommendations",
      description:
        "Get track recommendations based on seed artists, tracks, and/or genres. " +
        "You can provide up to 5 seed values total across all seed types. " +
        "Supports tunable attributes like target_energy, target_danceability, etc." +
        DEPRECATED_NOTE,
      inputSchema: getRecommendationsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const params: Record<string, unknown> = {};
        if (args.seed_artists?.length) params.seed_artists = args.seed_artists.join(",");
        if (args.seed_tracks?.length) params.seed_tracks = args.seed_tracks.join(",");
        if (args.seed_genres?.length) params.seed_genres = args.seed_genres.join(",");
        if (args.limit) params.limit = args.limit;
        if (args.market) params.market = args.market;

        // Tunable attributes
        for (const key of [
          "target_energy",
          "target_danceability",
          "target_valence",
          "target_tempo",
          "target_acousticness",
          "target_instrumentalness",
          "target_liveness",
          "target_speechiness",
        ] as const) {
          if (args[key] !== undefined) params[key] = args[key];
        }

        const result = await spotify.get<SpotifyRecommendations>("/recommendations", params);

        const lines = ["# Recommendations\n"];

        if (result.seeds.length) {
          lines.push("**Seeds:**");
          for (const seed of result.seeds) {
            lines.push(`  - ${seed.type}: \`${seed.id}\` (pool: ${seed.initialPoolSize} -> ${seed.afterFilteringSize})`);
          }
          lines.push("");
        }

        if (result.tracks.length) {
          lines.push("**Tracks:**");
          lines.push(...result.tracks.map((t, i) => formatTrack(t, i)));
        } else {
          lines.push("No recommendations found. Try different seeds.");
        }

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_genre_seeds",
    {
      title: "Get Genre Seeds",
      description:
        "Get the list of available genre seed values for use with spotify_get_recommendations." +
        DEPRECATED_NOTE,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const result = await spotify.get<{ genres: string[] }>(
          "/recommendations/available-genre-seeds",
        );

        return textContent(
          `# Available Genre Seeds (${result.genres.length})\n\n` +
          result.genres.join(", ")
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

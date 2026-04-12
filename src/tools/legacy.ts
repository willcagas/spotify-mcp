import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getAudioFeaturesSchema, getAudioAnalysisSchema } from "../schemas/legacy.js";
import type { SpotifyAudioFeatures } from "../types.js";
import { textContent, jsonContent } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

const DEPRECATED_NOTE =
  " [DEPRECATED] This endpoint returns 403 for apps created after Nov 27, 2024. " +
  "Only works for grandfathered apps with extended-mode access.";

export function registerLegacyTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_audio_features",
    {
      title: "Get Audio Features",
      description:
        "Get audio features (danceability, energy, key, tempo, etc.) for a track." +
        DEPRECATED_NOTE,
      inputSchema: getAudioFeaturesSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const features = await spotify.get<SpotifyAudioFeatures>(`/audio-features/${id}`);

        const keyNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const key = features.key >= 0 ? keyNames[features.key] : "Unknown";
        const mode = features.mode === 1 ? "Major" : "Minor";

        return textContent(
          `# Audio Features for \`${features.uri}\`\n\n` +
          `**Key:** ${key} ${mode}\n` +
          `**Tempo:** ${features.tempo.toFixed(1)} BPM\n` +
          `**Time Signature:** ${features.time_signature}/4\n` +
          `**Loudness:** ${features.loudness.toFixed(1)} dB\n\n` +
          `| Attribute | Value |\n` +
          `|---|---|\n` +
          `| Danceability | ${(features.danceability * 100).toFixed(0)}% |\n` +
          `| Energy | ${(features.energy * 100).toFixed(0)}% |\n` +
          `| Valence | ${(features.valence * 100).toFixed(0)}% |\n` +
          `| Acousticness | ${(features.acousticness * 100).toFixed(0)}% |\n` +
          `| Instrumentalness | ${(features.instrumentalness * 100).toFixed(0)}% |\n` +
          `| Liveness | ${(features.liveness * 100).toFixed(0)}% |\n` +
          `| Speechiness | ${(features.speechiness * 100).toFixed(0)}% |`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_audio_analysis",
    {
      title: "Get Audio Analysis",
      description:
        "Get a detailed audio analysis for a track (sections, segments, beats, bars, tatums). " +
        "Returns raw JSON due to the large and complex structure." +
        DEPRECATED_NOTE,
      inputSchema: getAudioAnalysisSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const analysis = await spotify.get<unknown>(`/audio-analysis/${id}`);
        return jsonContent(analysis);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

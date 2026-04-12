import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getTrackSchema } from "../schemas/tracks.js";
import type { SpotifyTrack } from "../types.js";
import { textContent, formatDuration, formatArtistNames } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerTrackTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_track",
    {
      title: "Get Track",
      description: "Get detailed information about a Spotify track by its ID.",
      inputSchema: getTrackSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, market }) => {
      try {
        const track = await spotify.get<SpotifyTrack>(`/tracks/${id}`, {
          ...(market && { market }),
        });

        return textContent(
          `# ${track.name}\n\n` +
          `**Artist:** ${formatArtistNames(track.artists)}\n` +
          `**Album:** ${track.album.name}\n` +
          `**Duration:** ${formatDuration(track.duration_ms)}\n` +
          `**Track:** ${track.track_number} / Disc ${track.disc_number}\n` +
          `**Explicit:** ${track.explicit ? "Yes" : "No"}\n` +
          `**URI:** \`${track.uri}\`\n` +
          `**URL:** ${track.external_urls.spotify}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

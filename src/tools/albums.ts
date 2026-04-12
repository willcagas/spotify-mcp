import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getAlbumSchema, getAlbumTracksSchema } from "../schemas/albums.js";
import { DEFAULT_PAGINATION_LIMIT } from "../constants.js";
import type { SpotifyAlbum, SpotifyTrackSimplified, PaginatedResponse } from "../types.js";
import { textContent, formatTrack, formatArtistNames, formatPagination } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerAlbumTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_album",
    {
      title: "Get Album",
      description: "Get detailed information about a Spotify album by its ID.",
      inputSchema: getAlbumSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, market }) => {
      try {
        const album = await spotify.get<SpotifyAlbum>(`/albums/${id}`, {
          ...(market && { market }),
        });

        return textContent(
          `# ${album.name}\n\n` +
          `**Artist:** ${formatArtistNames(album.artists)}\n` +
          `**Type:** ${album.album_type}\n` +
          `**Release:** ${album.release_date}\n` +
          `**Tracks:** ${album.total_tracks}\n` +
          `**Label:** ${album.label}\n` +
          (album.genres.length ? `**Genres:** ${album.genres.join(", ")}\n` : "") +
          `**URI:** \`${album.uri}\`\n` +
          `**URL:** ${album.external_urls.spotify}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_album_tracks",
    {
      title: "Get Album Tracks",
      description: "Get the tracks of a Spotify album.",
      inputSchema: getAlbumTracksSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, limit, offset, market }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SpotifyTrackSimplified>>(
          `/albums/${id}/tracks`,
          {
            limit: limit ?? DEFAULT_PAGINATION_LIMIT,
            offset: offset ?? 0,
            ...(market && { market }),
          },
        );

        const lines = result.items.map((t, i) => formatTrack(t, (offset ?? 0) + i));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

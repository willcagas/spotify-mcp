import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getArtistSchema, getArtistAlbumsSchema, getRelatedArtistsSchema } from "../schemas/artists.js";
import { DEFAULT_PAGINATION_LIMIT } from "../constants.js";
import type { SpotifyArtist, SpotifyAlbumSimplified, PaginatedResponse } from "../types.js";
import { textContent, formatArtist, formatAlbum, formatPagination } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerArtistTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_artist",
    {
      title: "Get Artist",
      description: "Get detailed information about a Spotify artist by their ID.",
      inputSchema: getArtistSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const artist = await spotify.get<SpotifyArtist>(`/artists/${id}`);

        return textContent(
          `# ${artist.name}\n\n` +
          (artist.genres.length ? `**Genres:** ${artist.genres.join(", ")}\n` : "") +
          `**URI:** \`${artist.uri}\`\n` +
          `**URL:** ${artist.external_urls.spotify}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_artist_albums",
    {
      title: "Get Artist Albums",
      description: "Get an artist's albums, singles, compilations, or appearances.",
      inputSchema: getArtistAlbumsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, include_groups, limit, offset, market }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SpotifyAlbumSimplified>>(
          `/artists/${id}/albums`,
          {
            limit: limit ?? DEFAULT_PAGINATION_LIMIT,
            offset: offset ?? 0,
            ...(include_groups && { include_groups: include_groups.join(",") }),
            ...(market && { market }),
          },
        );

        const lines = result.items.map((a) => formatAlbum(a));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_related_artists",
    {
      title: "Get Related Artists",
      description: "Get artists related to a given artist.",
      inputSchema: getRelatedArtistsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const result = await spotify.get<{ artists: SpotifyArtist[] }>(
          `/artists/${id}/related-artists`,
        );

        if (!result.artists.length) return textContent("No related artists found.");

        const lines = ["# Related Artists\n"];
        lines.push(...result.artists.map((a) => formatArtist(a)));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getShowSchema, getShowEpisodesSchema, getEpisodeSchema } from "../schemas/shows.js";
import { DEFAULT_PAGINATION_LIMIT } from "../constants.js";
import type { SpotifyShow, SpotifyEpisode, PaginatedResponse } from "../types.js";
import { textContent, formatEpisode, formatDuration, formatPagination } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerShowTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_show",
    {
      title: "Get Show",
      description: "Get detailed information about a Spotify podcast show.",
      inputSchema: getShowSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, market }) => {
      try {
        const show = await spotify.get<SpotifyShow>(`/shows/${id}`, {
          ...(market && { market }),
        });

        return textContent(
          `# ${show.name}\n\n` +
          `**Publisher:** ${show.publisher ?? "Unknown"}\n` +
          `**Episodes:** ${show.total_episodes}\n` +
          `**Languages:** ${show.languages.join(", ")}\n` +
          `**Media Type:** ${show.media_type}\n` +
          `**URI:** \`${show.uri}\`\n` +
          `**URL:** ${show.external_urls.spotify}\n\n` +
          `**Description:** ${show.description}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_show_episodes",
    {
      title: "Get Show Episodes",
      description: "Get the episodes of a Spotify podcast show.",
      inputSchema: getShowEpisodesSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, limit, offset, market }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SpotifyEpisode>>(
          `/shows/${id}/episodes`,
          {
            limit: limit ?? DEFAULT_PAGINATION_LIMIT,
            offset: offset ?? 0,
            ...(market && { market }),
          },
        );

        const lines = result.items
          .filter((ep): ep is SpotifyEpisode => ep !== null)
          .map((ep, i) => {
            return `${(offset ?? 0) + i + 1}. **${ep.name}** (${ep.release_date}, ${formatDuration(ep.duration_ms)}) \`${ep.uri}\``;
          });
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_episode",
    {
      title: "Get Episode",
      description: "Get detailed information about a Spotify podcast episode.",
      inputSchema: getEpisodeSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, market }) => {
      try {
        const ep = await spotify.get<SpotifyEpisode>(`/episodes/${id}`, {
          ...(market && { market }),
        });

        return textContent(
          `# ${ep.name}\n\n` +
          `**Show:** ${ep.show?.name ?? "Unknown"}\n` +
          `**Release:** ${ep.release_date}\n` +
          `**Duration:** ${formatDuration(ep.duration_ms)}\n` +
          `**Language:** ${ep.language}\n` +
          `**URI:** \`${ep.uri}\`\n` +
          `**URL:** ${ep.external_urls.spotify}\n\n` +
          `**Description:** ${ep.description}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

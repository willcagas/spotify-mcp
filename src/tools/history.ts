import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getTopItemsSchema, getRecentlyPlayedSchema } from "../schemas/history.js";
import type {
  SpotifyTrack,
  SpotifyArtist,
  PlayHistory,
  PaginatedResponse,
  CursorPaginatedResponse,
} from "../types.js";
import {
  textContent,
  formatTrack,
  formatArtist,
  formatPagination,
} from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerHistoryTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_top_artists",
    {
      title: "Get Top Artists",
      description:
        "Get the user's top artists based on listening history. " +
        "Time ranges: 'short_term' (~4 weeks), 'medium_term' (~6 months), 'long_term' (all time).",
      inputSchema: getTopItemsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ time_range, limit, offset }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SpotifyArtist>>(
          "/me/top/artists",
          {
            time_range: time_range ?? "medium_term",
            limit: limit ?? 20,
            offset: offset ?? 0,
          },
        );

        const lines = [`# Top Artists (${time_range ?? "medium_term"})\n`];
        lines.push(...result.items.map((a, i) => `${(offset ?? 0) + i + 1}. ${formatArtist(a)}`));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_top_tracks",
    {
      title: "Get Top Tracks",
      description:
        "Get the user's top tracks based on listening history. " +
        "Time ranges: 'short_term' (~4 weeks), 'medium_term' (~6 months), 'long_term' (all time).",
      inputSchema: getTopItemsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ time_range, limit, offset }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SpotifyTrack>>(
          "/me/top/tracks",
          {
            time_range: time_range ?? "medium_term",
            limit: limit ?? 20,
            offset: offset ?? 0,
          },
        );

        const lines = [`# Top Tracks (${time_range ?? "medium_term"})\n`];
        lines.push(...result.items.map((t, i) => formatTrack(t, (offset ?? 0) + i)));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_recently_played",
    {
      title: "Get Recently Played",
      description: "Get the user's recently played tracks.",
      inputSchema: getRecentlyPlayedSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit, after, before }) => {
      try {
        const result = await spotify.get<CursorPaginatedResponse<PlayHistory>>(
          "/me/player/recently-played",
          {
            limit: limit ?? 20,
            ...(after !== undefined && { after }),
            ...(before !== undefined && { before }),
          },
        );

        const lines = ["# Recently Played\n"];
        lines.push(
          ...result.items.map((item, i) => {
            const time = new Date(item.played_at).toLocaleString();
            return `${i + 1}. ${formatTrack(item.track)} — *${time}*`;
          }),
        );

        if (result.cursors?.after) {
          lines.push(`\n---\nNext cursor (after): \`${result.cursors.after}\``);
        }

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

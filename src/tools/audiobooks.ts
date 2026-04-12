import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getAudiobookSchema, getAudiobookChaptersSchema, getChapterSchema } from "../schemas/audiobooks.js";
import { DEFAULT_PAGINATION_LIMIT } from "../constants.js";
import type { SpotifyAudiobook, SpotifyChapter, PaginatedResponse } from "../types.js";
import { textContent, formatDuration, formatPagination } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerAudiobookTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_audiobook",
    {
      title: "Get Audiobook",
      description:
        "Get detailed information about a Spotify audiobook. " +
        "Note: Audiobooks are only available in US, UK, CA, IE, NZ, and AU markets.",
      inputSchema: getAudiobookSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, market }) => {
      try {
        const book = await spotify.get<SpotifyAudiobook>(`/audiobooks/${id}`, {
          ...(market && { market }),
        });

        const authors = book.authors.map((a) => a.name).join(", ");
        const narrators = book.narrators.map((n) => n.name).join(", ");

        return textContent(
          `# ${book.name}\n\n` +
          `**Authors:** ${authors}\n` +
          `**Narrators:** ${narrators}\n` +
          `**Chapters:** ${book.total_chapters}\n` +
          `**Languages:** ${book.languages.join(", ")}\n` +
          `**URI:** \`${book.uri}\`\n` +
          `**URL:** ${book.external_urls.spotify}\n\n` +
          `**Description:** ${book.description}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_audiobook_chapters",
    {
      title: "Get Audiobook Chapters",
      description: "Get the chapters of a Spotify audiobook.",
      inputSchema: getAudiobookChaptersSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, limit, offset, market }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SpotifyChapter>>(
          `/audiobooks/${id}/chapters`,
          {
            limit: limit ?? DEFAULT_PAGINATION_LIMIT,
            offset: offset ?? 0,
            ...(market && { market }),
          },
        );

        const lines = result.items.map((ch, i) => {
          return `${(offset ?? 0) + i + 1}. **${ch.name}** (${formatDuration(ch.duration_ms)}) \`${ch.uri}\``;
        });
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_chapter",
    {
      title: "Get Chapter",
      description: "Get detailed information about an audiobook chapter.",
      inputSchema: getChapterSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, market }) => {
      try {
        const ch = await spotify.get<SpotifyChapter>(`/chapters/${id}`, {
          ...(market && { market }),
        });

        return textContent(
          `# ${ch.name}\n\n` +
          `**Audiobook:** ${ch.audiobook.name}\n` +
          `**Chapter:** ${ch.chapter_number}\n` +
          `**Duration:** ${formatDuration(ch.duration_ms)}\n` +
          `**URI:** \`${ch.uri}\`\n` +
          `**URL:** ${ch.external_urls.spotify}\n\n` +
          `**Description:** ${ch.description}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

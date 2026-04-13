import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { searchSchema } from "../schemas/search.js";
import { SEARCH_DEFAULT_LIMIT } from "../constants.js";
import type { SpotifySearchResult } from "../types.js";
import {
  textContent,
  formatTrack,
  formatAlbum,
  formatArtist,
  formatPlaylist,
  formatEpisode,
  formatShow,
  formatAudiobook,
  formatPagination,
} from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerSearchTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_search",
    {
      title: "Search Spotify",
      description:
        "Search for tracks, artists, albums, playlists, shows, episodes, or audiobooks on Spotify. " +
        "Note: As of Feb 2026, the maximum limit per type is 10 (default: 5).",
      inputSchema: searchSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ query, types, limit, offset, market }) => {
      try {
        const result = await spotify.get<SpotifySearchResult>("/search", {
          q: query,
          type: types.join(","),
          limit: limit ?? SEARCH_DEFAULT_LIMIT,
          offset: offset ?? 0,
          ...(market && { market }),
        });

        const sections: string[] = [`# Search results for "${query}"\n`];

        if (result.tracks?.items?.length) {
          sections.push("## Tracks");
          sections.push(result.tracks.items.map((t, i) => formatTrack(t, i)).join("\n"));
          sections.push(formatPagination(result.tracks.total, result.tracks.limit, result.tracks.offset));
        }

        if (result.artists?.items?.length) {
          sections.push("\n## Artists");
          sections.push(result.artists.items.map((a) => formatArtist(a)).join("\n"));
          sections.push(formatPagination(result.artists.total, result.artists.limit, result.artists.offset));
        }

        if (result.albums?.items?.length) {
          sections.push("\n## Albums");
          sections.push(result.albums.items.map((a) => formatAlbum(a)).join("\n"));
          sections.push(formatPagination(result.albums.total, result.albums.limit, result.albums.offset));
        }

        if (result.playlists?.items?.length) {
          sections.push("\n## Playlists");
          sections.push(result.playlists.items.map((p) => formatPlaylist(p)).join("\n"));
          sections.push(formatPagination(result.playlists.total, result.playlists.limit, result.playlists.offset));
        }

        if (result.shows?.items?.length) {
          sections.push("\n## Shows");
          sections.push(result.shows.items.map((s) => formatShow(s)).join("\n"));
          sections.push(formatPagination(result.shows.total, result.shows.limit, result.shows.offset));
        }

        if (result.episodes?.items?.length) {
          sections.push("\n## Episodes");
          sections.push(result.episodes.items.map((e) => formatEpisode(e)).join("\n"));
          sections.push(formatPagination(result.episodes.total, result.episodes.limit, result.episodes.offset));
        }

        if (result.audiobooks?.items?.length) {
          sections.push("\n## Audiobooks");
          sections.push(result.audiobooks.items.map((a) => formatAudiobook(a)).join("\n"));
          sections.push(formatPagination(result.audiobooks.total, result.audiobooks.limit, result.audiobooks.offset));
        }

        if (sections.length === 1) {
          sections.push("No results found.");
        }

        return textContent(sections.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

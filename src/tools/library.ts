import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import {
  addToLibrarySchema,
  removeFromLibrarySchema,
  checkLibrarySchema,
  getMyTracksSchema,
  getMyAlbumsSchema,
  getMyShowsSchema,
  getMyEpisodesSchema,
  getMyAudiobooksSchema,
} from "../schemas/library.js";
import { DEFAULT_PAGINATION_LIMIT } from "../constants.js";
import type {
  SavedTrack,
  SavedAlbum,
  SavedShow,
  SavedEpisode,
  SavedAudiobook,
  PaginatedResponse,
} from "../types.js";
import {
  textContent,
  formatTrack,
  formatAlbum,
  formatShow,
  formatEpisode,
  formatAudiobook,
  formatPagination,
} from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

const TYPE_ENDPOINTS: Record<string, string> = {
  track: "/me/tracks",
  album: "/me/albums",
  show: "/me/shows",
  episode: "/me/episodes",
  audiobook: "/me/audiobooks",
  playlist: "/me/playlists",
};

function groupUrisByType(uris: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const uri of uris) {
    const parts = uri.split(":");
    const type = parts[1];
    const id = parts[2];
    if (!groups[type]) groups[type] = [];
    groups[type].push(id);
  }
  return groups;
}

export function registerLibraryTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_add_to_library",
    {
      title: "Add to Library",
      description:
        "Save items to the user's library using Spotify URIs. " +
        "Supports ALL types: tracks, albums, episodes, shows, audiobooks, artists (follow), users (follow), and playlists (follow). " +
        "This replaces the old separate save/follow endpoints.",
      inputSchema: addToLibrarySchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ uris }) => {
      try {
        await spotify.put("/me/library", undefined, { params: { uris: uris.join(",") } });
        return textContent(`Saved ${uris.length} item(s) to library.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_remove_from_library",
    {
      title: "Remove from Library",
      description:
        "Remove items from the user's library using Spotify URIs. " +
        "Supports ALL types: tracks, albums, episodes, shows, audiobooks, artists (unfollow), users (unfollow), and playlists (unfollow).",
      inputSchema: removeFromLibrarySchema,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ uris }) => {
      try {
        await spotify.delete("/me/library", { params: { uris: uris.join(",") } });
        return textContent(`Removed ${uris.length} item(s) from library.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_check_library",
    {
      title: "Check Library",
      description:
        "Check if items are saved in the user's library. " +
        "Supports ALL types: tracks, albums, episodes, shows, audiobooks, artists, users, and playlists.",
      inputSchema: checkLibrarySchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ uris }) => {
      try {
        const result = await spotify.get<boolean[]>("/me/library/contains", { uris: uris.join(",") });
        const lines = uris.map((uri, i) => `\`${uri}\`: ${result[i] ? "Saved" : "Not saved"}`);
        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_my_tracks",
    {
      title: "Get My Saved Tracks",
      description: "Get the user's saved tracks from their library.",
      inputSchema: getMyTracksSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit, offset }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SavedTrack>>("/me/tracks", {
          limit: limit ?? DEFAULT_PAGINATION_LIMIT,
          offset: offset ?? 0,
        });

        const lines = ["# My Saved Tracks\n"];
        lines.push(...result.items.map((s, i) => formatTrack(s.track, (offset ?? 0) + i)));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_my_albums",
    {
      title: "Get My Saved Albums",
      description: "Get the user's saved albums from their library.",
      inputSchema: getMyAlbumsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit, offset }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SavedAlbum>>("/me/albums", {
          limit: limit ?? DEFAULT_PAGINATION_LIMIT,
          offset: offset ?? 0,
        });

        const lines = ["# My Saved Albums\n"];
        lines.push(...result.items.map((s) => formatAlbum(s.album)));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_my_shows",
    {
      title: "Get My Saved Shows",
      description: "Get the user's saved podcast shows from their library.",
      inputSchema: getMyShowsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit, offset }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SavedShow>>("/me/shows", {
          limit: limit ?? DEFAULT_PAGINATION_LIMIT,
          offset: offset ?? 0,
        });

        const lines = ["# My Saved Shows\n"];
        lines.push(...result.items.map((s) => formatShow(s.show)));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_my_episodes",
    {
      title: "Get My Saved Episodes",
      description: "Get the user's saved podcast episodes from their library.",
      inputSchema: getMyEpisodesSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit, offset }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SavedEpisode>>("/me/episodes", {
          limit: limit ?? DEFAULT_PAGINATION_LIMIT,
          offset: offset ?? 0,
        });

        const lines = ["# My Saved Episodes\n"];
        lines.push(...result.items.map((s) => formatEpisode(s.episode)));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_my_audiobooks",
    {
      title: "Get My Saved Audiobooks",
      description: "Get the user's saved audiobooks from their library.",
      inputSchema: getMyAudiobooksSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit, offset }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SavedAudiobook>>("/me/audiobooks", {
          limit: limit ?? DEFAULT_PAGINATION_LIMIT,
          offset: offset ?? 0,
        });

        const lines = ["# My Saved Audiobooks\n"];
        lines.push(...result.items.map((s) => formatAudiobook(s.audiobook)));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

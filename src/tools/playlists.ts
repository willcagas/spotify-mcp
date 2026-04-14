import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import {
  getPlaylistSchema,
  getPlaylistItemsSchema,
  createPlaylistSchema,
  updatePlaylistSchema,
  addPlaylistItemsSchema,
  removePlaylistItemsSchema,
  reorderPlaylistItemsSchema,
  getMyPlaylistsSchema,
  getPlaylistCoverSchema,
  uploadPlaylistCoverSchema,
} from "../schemas/playlists.js";
import { DEFAULT_PAGINATION_LIMIT } from "../constants.js";
import type {
  SpotifyPlaylist,
  SpotifyUserProfile,
  PlaylistItem,
  PaginatedResponse,
  SpotifyImage,
} from "../types.js";
import { textContent, formatPlaylist, formatTrack, formatEpisode, formatPagination } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerPlaylistTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_playlist",
    {
      title: "Get Playlist",
      description: "Get detailed information about a Spotify playlist.",
      inputSchema: getPlaylistSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, market }) => {
      try {
        const pl = await spotify.get<SpotifyPlaylist>(`/playlists/${id}`, {
          ...(market && { market }),
        });

        const owner = pl.owner.display_name ?? pl.owner.id;
        return textContent(
          `# ${pl.name}\n\n` +
          (pl.description ? `${pl.description}\n\n` : "") +
          `**Owner:** ${owner}\n` +
          `**Tracks:** ${pl.tracks?.total ?? "Unknown"}\n` +
          `**Public:** ${pl.public === null ? "Unknown" : pl.public ? "Yes" : "No"}\n` +
          `**Collaborative:** ${pl.collaborative ? "Yes" : "No"}\n` +
          `**Snapshot:** \`${pl.snapshot_id}\`\n` +
          `**URI:** \`${pl.uri}\`\n` +
          `**URL:** ${pl.external_urls.spotify}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_playlist_items",
    {
      title: "Get Playlist Items",
      description:
        "Get the items (tracks/episodes) in a playlist. " +
        "Returns 403 if you are not the owner or a collaborator of the playlist.",
      inputSchema: getPlaylistItemsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, limit, offset, market }) => {
      try {
        const result = await spotify.get<PaginatedResponse<PlaylistItem>>(
          `/playlists/${id}/items`,
          {
            limit: limit ?? DEFAULT_PAGINATION_LIMIT,
            offset: offset ?? 0,
            ...(market && { market }),
          },
        );

        const lines = result.items
          .filter((item) => item.item !== null)
          .map((item, i) => {
            const content = item.item!;
            if ("album" in content) {
              return formatTrack(content, (offset ?? 0) + i);
            }
            return `${(offset ?? 0) + i + 1}. ${formatEpisode(content)}`;
          });
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_create_playlist",
    {
      title: "Create Playlist",
      description: "Create a new playlist for the current user.",
      inputSchema: createPlaylistSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ name, description, public: isPublic, collaborative }) => {
      try {
        const me = await spotify.get<SpotifyUserProfile>("/me");
        const pl = await spotify.post<SpotifyPlaylist>(`/me/playlists`, {
          name,
          ...(description && { description }),
          ...(isPublic !== undefined && { public: isPublic }),
          ...(collaborative !== undefined && { collaborative }),
        });

        return textContent(
          `Playlist created!\n\n` +
          `**Name:** ${pl.name}\n` +
          `**URI:** \`${pl.uri}\`\n` +
          `**URL:** ${pl.external_urls.spotify}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_update_playlist",
    {
      title: "Update Playlist Details",
      description: "Change a playlist's name, description, or public/collaborative status.",
      inputSchema: updatePlaylistSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, name, description, public: isPublic, collaborative }) => {
      try {
        await spotify.put(`/playlists/${id}`, {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isPublic !== undefined && { public: isPublic }),
          ...(collaborative !== undefined && { collaborative }),
        });
        return textContent("Playlist updated.");
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_add_playlist_items",
    {
      title: "Add Items to Playlist",
      description: "Add tracks or episodes to a playlist by their Spotify URIs.",
      inputSchema: addPlaylistItemsSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, uris, position }) => {
      try {
        await spotify.post(`/playlists/${id}/items`, {
          uris,
          ...(position !== undefined && { position }),
        });
        return textContent(`Added ${uris.length} item(s) to playlist.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_remove_playlist_items",
    {
      title: "Remove Items from Playlist",
      description: "Remove tracks or episodes from a playlist by their Spotify URIs.",
      inputSchema: removePlaylistItemsSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ id, uris, snapshot_id }) => {
      try {
        await spotify.delete(`/playlists/${id}/items`, {
          data: {
            items: uris.map((uri) => ({ uri })),
            ...(snapshot_id && { snapshot_id }),
          },
        });
        return textContent(`Removed ${uris.length} item(s) from playlist.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_reorder_playlist_items",
    {
      title: "Reorder Playlist Items",
      description: "Reorder items in a playlist by moving a range of tracks to a new position.",
      inputSchema: reorderPlaylistItemsSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ id, range_start, insert_before, range_length, snapshot_id }) => {
      try {
        await spotify.put(`/playlists/${id}/items`, {
          range_start,
          insert_before,
          ...(range_length && { range_length }),
          ...(snapshot_id && { snapshot_id }),
        });
        return textContent("Playlist items reordered.");
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_my_playlists",
    {
      title: "Get My Playlists",
      description: "Get the current user's playlists.",
      inputSchema: getMyPlaylistsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit, offset }) => {
      try {
        const result = await spotify.get<PaginatedResponse<SpotifyPlaylist>>(
          "/me/playlists",
          {
            limit: limit ?? DEFAULT_PAGINATION_LIMIT,
            offset: offset ?? 0,
          },
        );

        const lines = ["# My Playlists\n"];
        lines.push(...result.items.map((p) => formatPlaylist(p)));
        lines.push(formatPagination(result.total, result.limit, result.offset));

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_playlist_cover",
    {
      title: "Get Playlist Cover Image",
      description: "Get the cover image of a playlist.",
      inputSchema: getPlaylistCoverSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const images = await spotify.get<SpotifyImage[]>(`/playlists/${id}/images`);
        if (!images.length) return textContent("No cover image set for this playlist.");

        const lines = ["# Playlist Cover Images\n"];
        for (const img of images) {
          lines.push(`- ${img.width ?? "?"}x${img.height ?? "?"}: ${img.url}`);
        }
        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_upload_playlist_cover",
    {
      title: "Upload Playlist Cover Image",
      description:
        "Upload a custom cover image for a playlist. " +
        "Image must be a Base64-encoded JPEG, max 256KB. " +
        "Requires ugc-image-upload and playlist-modify-public/private scopes.",
      inputSchema: uploadPlaylistCoverSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, image_base64 }) => {
      try {
        await spotify.put(`/playlists/${id}/images`, image_base64, {
          headers: { "Content-Type": "image/jpeg" },
        });
        return textContent("Playlist cover image uploaded.");
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import { getFollowedArtistsSchema } from "../schemas/user.js";
import type { SpotifyUserProfile, SpotifyArtist, CursorPaginatedResponse } from "../types.js";
import { textContent, formatArtist } from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

export function registerUserTools(server: McpServer, spotify: SpotifyClient): void {
  server.registerTool(
    "spotify_get_me",
    {
      title: "Get My Profile",
      description: "Get the current user's Spotify profile information.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const me = await spotify.get<SpotifyUserProfile>("/me");

        return textContent(
          `# My Profile\n\n` +
          `**Name:** ${me.display_name ?? "N/A"}\n` +
          `**ID:** ${me.id}\n` +
          (me.email ? `**Email:** ${me.email}\n` : "") +
          (me.product ? `**Plan:** ${me.product}\n` : "") +
          `**URI:** \`${me.uri}\`\n` +
          `**URL:** ${me.external_urls.spotify}`
        );
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_followed_artists",
    {
      title: "Get Followed Artists",
      description: "Get the artists the current user follows.",
      inputSchema: getFollowedArtistsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ limit, after }) => {
      try {
        const result = await spotify.get<{
          artists: CursorPaginatedResponse<SpotifyArtist>;
        }>("/me/following", {
          type: "artist",
          limit: limit ?? 20,
          ...(after && { after }),
        });

        const artists = result.artists;
        const lines = ["# Followed Artists\n"];
        lines.push(...artists.items.map((a) => formatArtist(a)));

        if (artists.cursors?.after) {
          lines.push(`\n---\nNext cursor: \`${artists.cursors.after}\``);
        } else {
          lines.push("\n---\nEnd of results");
        }

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TokenManager } from "./services/auth.js";
import { SpotifyClient } from "./services/spotify-api.js";
import { registerSearchTools } from "./tools/search.js";
import { registerPlayerTools } from "./tools/player.js";
import { registerTrackTools } from "./tools/tracks.js";
import { registerAlbumTools } from "./tools/albums.js";
import { registerArtistTools } from "./tools/artists.js";
import { registerPlaylistTools } from "./tools/playlists.js";
import { registerLibraryTools } from "./tools/library.js";
import { registerUserTools } from "./tools/user.js";
import { registerHistoryTools } from "./tools/history.js";
import { registerShowTools } from "./tools/shows.js";
import { registerAudiobookTools } from "./tools/audiobooks.js";
import { registerRecommendationTools } from "./tools/recommendations.js";
import { registerLegacyTools } from "./tools/legacy.js";

async function main(): Promise<void> {
  const tokenManager = new TokenManager();
  const spotify = new SpotifyClient(tokenManager);

  const server = new McpServer({
    name: "spotify-mcp-server",
    version: "1.0.0",
  });

  // Register all tool domains
  registerSearchTools(server, spotify);
  registerPlayerTools(server, spotify);
  registerTrackTools(server, spotify);
  registerAlbumTools(server, spotify);
  registerArtistTools(server, spotify);
  registerPlaylistTools(server, spotify);
  registerLibraryTools(server, spotify);
  registerUserTools(server, spotify);
  registerHistoryTools(server, spotify);
  registerShowTools(server, spotify);
  registerAudiobookTools(server, spotify);
  registerRecommendationTools(server, spotify);
  registerLegacyTools(server, spotify);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write("Spotify MCP server running on stdio\n");
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});

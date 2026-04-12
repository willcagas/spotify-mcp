# spotify-mcp-server

A comprehensive Spotify MCP (Model Context Protocol) server with **54 tools** covering the full Spotify Web API. Control playback, manage playlists, search, browse your library, and more — all through an LLM.

## Features

- **Player Control** (14 tools) — Play, pause, skip, seek, volume, shuffle, repeat, queue, devices, transfer playback. *Requires Spotify Premium.*
- **Search** — Search across tracks, artists, albums, playlists, shows, episodes, and audiobooks
- **Content Lookup** (6 tools) — Get details for tracks, albums, and artists
- **Playlists** (10 tools) — Full CRUD, reorder items, get/upload cover images
- **Library** (8 tools) — Save/remove/check any content type via unified endpoints (tracks, albums, shows, episodes, audiobooks, artists, users, playlists)
- **User & History** (5 tools) — Profile, followed artists, top artists/tracks, recently played
- **Podcasts** (3 tools) — Shows and episodes
- **Audiobooks** (3 tools) — Audiobooks and chapters
- **Recommendations** (2 tools) — Seed-based recommendations with tunable attributes *(deprecated for new apps)*
- **Audio Analysis** (2 tools) — Audio features and detailed analysis *(deprecated for new apps)*

## Prerequisites

- **Node.js** >= 18
- **Spotify Developer Account** — Create an app at https://developer.spotify.com/dashboard
- **Spotify Premium** — Required for playback control tools

## Setup

### 1. Create a Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Set the redirect URI to `http://127.0.0.1/callback` (must use `127.0.0.1`, NOT `localhost`)
4. Copy your **Client ID**

### 2. Install and Build

```bash
git clone <this-repo>
cd spotify-mcp
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/path/to/spotify-mcp/dist/index.js"],
      "env": {
        "SPOTIFY_CLIENT_ID": "your_client_id_here"
      }
    }
  }
}
```

### 4. Authenticate

On first use, the server will open your browser to authorize with Spotify. A temporary local server on `http://127.0.0.1:{port}/callback` handles the OAuth redirect. Tokens are stored at `~/.spotify-mcp/tokens.json`.

**No client secret is required** — the server uses OAuth 2.0 Authorization Code with PKCE.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | Your Spotify app's Client ID |
| `SPOTIFY_CLIENT_SECRET` | No | Optional. Only needed if you prefer the classic auth code flow over PKCE |
| `SPOTIFY_REDIRECT_URI` | No | Override redirect URI (default: `http://127.0.0.1:{random_port}/callback`) |

## Important Limitations

### Premium Required
All playback mutation tools (play, pause, skip, seek, volume, shuffle, repeat, queue, transfer) require **Spotify Premium**.

### Playlist Items Access
`spotify_get_playlist_items` returns **403** if you are not the owner or a collaborator of the playlist (Dev Mode restriction as of Feb 2026).

### Deprecated Endpoints
The following tools only work for apps with grandfathered extended-mode access (created before Nov 27, 2024). New apps receive **403**:
- `spotify_get_recommendations`
- `spotify_get_genre_seeds`
- `spotify_get_audio_features`
- `spotify_get_audio_analysis`

### Feb 2026 API Changes
This server accounts for Spotify's February 2026 breaking changes:
- Batch fetch endpoints removed
- Browse/discovery endpoints removed
- Artist top tracks removed
- Public user profiles removed
- Library endpoints consolidated into unified `PUT/DELETE /me/library`
- Search max limit reduced to 10

### Spotify Developer Policy
Spotify content may not be used to train or ingest into ML/AI models. This server enables an LLM to *control* Spotify and *read* metadata for the authenticated user's benefit. Review Spotify's [Developer Terms](https://developer.spotify.com/terms) before deploying.

## Complete Tool Reference

| Domain | Tool | Description |
|--------|------|-------------|
| Search | `spotify_search` | Search for any content type |
| Player | `spotify_get_playback_state` | Current playback state |
| Player | `spotify_get_devices` | Available devices |
| Player | `spotify_get_currently_playing` | Currently playing track |
| Player | `spotify_transfer_playback` | Transfer to device (Premium) |
| Player | `spotify_play` | Start/resume playback (Premium) |
| Player | `spotify_pause` | Pause playback (Premium) |
| Player | `spotify_skip_next` | Skip to next (Premium) |
| Player | `spotify_skip_previous` | Skip to previous (Premium) |
| Player | `spotify_seek` | Seek to position (Premium) |
| Player | `spotify_set_repeat` | Set repeat mode (Premium) |
| Player | `spotify_set_volume` | Set volume (Premium) |
| Player | `spotify_set_shuffle` | Toggle shuffle (Premium) |
| Player | `spotify_get_queue` | Get playback queue |
| Player | `spotify_add_to_queue` | Add to queue (Premium) |
| Tracks | `spotify_get_track` | Get track details |
| Albums | `spotify_get_album` | Get album details |
| Albums | `spotify_get_album_tracks` | Get album tracks |
| Artists | `spotify_get_artist` | Get artist details |
| Artists | `spotify_get_artist_albums` | Get artist albums |
| Artists | `spotify_get_related_artists` | Get related artists |
| Playlists | `spotify_get_playlist` | Get playlist details |
| Playlists | `spotify_get_playlist_items` | Get playlist items |
| Playlists | `spotify_create_playlist` | Create playlist |
| Playlists | `spotify_update_playlist` | Update playlist details |
| Playlists | `spotify_add_playlist_items` | Add items to playlist |
| Playlists | `spotify_remove_playlist_items` | Remove items from playlist |
| Playlists | `spotify_reorder_playlist_items` | Reorder playlist items |
| Playlists | `spotify_get_my_playlists` | Get user's playlists |
| Playlists | `spotify_get_playlist_cover` | Get playlist cover image |
| Playlists | `spotify_upload_playlist_cover` | Upload playlist cover image |
| Library | `spotify_add_to_library` | Save items (all types) |
| Library | `spotify_remove_from_library` | Remove items (all types) |
| Library | `spotify_check_library` | Check if items are saved |
| Library | `spotify_get_my_tracks` | Get saved tracks |
| Library | `spotify_get_my_albums` | Get saved albums |
| Library | `spotify_get_my_shows` | Get saved shows |
| Library | `spotify_get_my_episodes` | Get saved episodes |
| Library | `spotify_get_my_audiobooks` | Get saved audiobooks |
| User | `spotify_get_me` | Get user profile |
| User | `spotify_get_followed_artists` | Get followed artists |
| History | `spotify_get_top_artists` | Get top artists |
| History | `spotify_get_top_tracks` | Get top tracks |
| History | `spotify_get_recently_played` | Get recently played |
| Shows | `spotify_get_show` | Get show details |
| Shows | `spotify_get_show_episodes` | Get show episodes |
| Shows | `spotify_get_episode` | Get episode details |
| Audiobooks | `spotify_get_audiobook` | Get audiobook details |
| Audiobooks | `spotify_get_audiobook_chapters` | Get audiobook chapters |
| Audiobooks | `spotify_get_chapter` | Get chapter details |
| Legacy | `spotify_get_recommendations` | Get recommendations (deprecated) |
| Legacy | `spotify_get_genre_seeds` | Get genre seeds (deprecated) |
| Legacy | `spotify_get_audio_features` | Get audio features (deprecated) |
| Legacy | `spotify_get_audio_analysis` | Get audio analysis (deprecated) |

## License

MIT

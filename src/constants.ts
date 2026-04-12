export const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
export const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export const CHARACTER_LIMIT = 25000;
export const DEFAULT_PAGINATION_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 10;
export const SEARCH_DEFAULT_LIMIT = 5;
export const MAX_RETRY_ATTEMPTS = 3;
export const TOKEN_REFRESH_BUFFER_MS = 60_000; // Refresh 60s before expiry

export const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-follow-read",
  "user-follow-modify",
  "user-library-read",
  "user-library-modify",
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
  "user-read-playback-position",
  "ugc-image-upload",
].join(" ");

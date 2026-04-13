export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyExternalUrls {
  spotify: string;
}

export interface SpotifyArtistSimplified {
  id: string;
  name: string;
  uri: string;
  external_urls: SpotifyExternalUrls;
}

export interface SpotifyArtist extends SpotifyArtistSimplified {
  genres: string[];
  images: SpotifyImage[];
  type: "artist";
}

export interface SpotifyAlbumSimplified {
  id: string;
  name: string;
  uri: string;
  album_type: string;
  total_tracks: number;
  release_date: string;
  images: SpotifyImage[];
  artists: SpotifyArtistSimplified[];
  external_urls: SpotifyExternalUrls;
}

export interface SpotifyAlbum extends SpotifyAlbumSimplified {
  genres: string[];
  label: string;
  tracks: PaginatedResponse<SpotifyTrackSimplified>;
  type: "album";
}

export interface SpotifyTrackSimplified {
  id: string;
  name: string;
  uri: string;
  track_number: number;
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  artists: SpotifyArtistSimplified[];
  external_urls: SpotifyExternalUrls;
}

export interface SpotifyTrack extends SpotifyTrackSimplified {
  album: SpotifyAlbumSimplified;
  type: "track";
}

export interface SpotifyShow {
  id: string;
  name: string;
  uri: string;
  description: string;
  publisher: string;
  total_episodes: number;
  images: SpotifyImage[];
  languages: string[];
  media_type: string;
  external_urls: SpotifyExternalUrls;
  type: "show";
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  uri: string;
  description: string;
  duration_ms: number;
  release_date: string;
  show: SpotifyShow;
  images: SpotifyImage[];
  language: string;
  external_urls: SpotifyExternalUrls;
  type: "episode";
}

export interface SpotifyAudiobook {
  id: string;
  name: string;
  uri: string;
  description: string;
  authors: Array<{ name: string }>;
  narrators: Array<{ name: string }>;
  total_chapters: number;
  images: SpotifyImage[];
  languages: string[];
  external_urls: SpotifyExternalUrls;
  type: "audiobook";
}

export interface SpotifyChapter {
  id: string;
  name: string;
  uri: string;
  description: string;
  chapter_number: number;
  duration_ms: number;
  audiobook: SpotifyAudiobook;
  images: SpotifyImage[];
  external_urls: SpotifyExternalUrls;
  type: "chapter";
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  description: string | null;
  public: boolean | null;
  collaborative: boolean;
  owner: SpotifyUser;
  tracks: { total: number };
  images: SpotifyImage[];
  snapshot_id: string;
  external_urls: SpotifyExternalUrls;
  type: "playlist";
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  uri: string;
  images: SpotifyImage[];
  external_urls: SpotifyExternalUrls;
  type: "user";
}

export interface SpotifyUserProfile extends SpotifyUser {
  email?: string;
  product?: string;
}

export interface SpotifyDevice {
  id: string | null;
  name: string;
  type: string;
  is_active: boolean;
  is_restricted: boolean;
  volume_percent: number | null;
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice;
  repeat_state: "off" | "context" | "track";
  shuffle_state: boolean;
  is_playing: boolean;
  item: SpotifyTrack | SpotifyEpisode | null;
  progress_ms: number | null;
  currently_playing_type: string;
  context: {
    uri: string;
    type: string;
    external_urls: SpotifyExternalUrls;
  } | null;
}

export interface SpotifyQueue {
  currently_playing: SpotifyTrack | SpotifyEpisode | null;
  queue: Array<SpotifyTrack | SpotifyEpisode>;
}

export interface SpotifyAudioFeatures {
  id: string;
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  key: number;
  liveness: number;
  loudness: number;
  mode: number;
  speechiness: number;
  tempo: number;
  time_signature: number;
  valence: number;
  duration_ms: number;
  uri: string;
}

export interface SpotifyRecommendations {
  seeds: Array<{
    id: string;
    type: string;
    initialPoolSize: number;
    afterFilteringSize: number;
    afterRelinkingSize: number;
  }>;
  tracks: SpotifyTrack[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  total?: number;
  limit: number;
  next: string | null;
  cursors: {
    after: string | null;
    before?: string | null;
  };
}

export interface SpotifySearchResult {
  tracks?: PaginatedResponse<SpotifyTrack>;
  artists?: PaginatedResponse<SpotifyArtist>;
  albums?: PaginatedResponse<SpotifyAlbumSimplified>;
  playlists?: PaginatedResponse<SpotifyPlaylist>;
  shows?: PaginatedResponse<SpotifyShow>;
  episodes?: PaginatedResponse<SpotifyEpisode>;
  audiobooks?: PaginatedResponse<SpotifyAudiobook>;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface PlaylistItem {
  added_at: string;
  added_by: { id: string };
  is_local: boolean;
  item: SpotifyTrack | SpotifyEpisode | null;
}

export interface SavedTrack {
  added_at: string;
  track: SpotifyTrack;
}

export interface SavedAlbum {
  added_at: string;
  album: SpotifyAlbum;
}

export interface SavedShow {
  added_at: string;
  show: SpotifyShow;
}

export interface SavedEpisode {
  added_at: string;
  episode: SpotifyEpisode;
}

export interface SavedAudiobook {
  added_at: string;
  audiobook: SpotifyAudiobook;
}

export interface PlayHistory {
  track: SpotifyTrack;
  played_at: string;
  context: {
    uri: string;
    type: string;
    external_urls: SpotifyExternalUrls;
  } | null;
}

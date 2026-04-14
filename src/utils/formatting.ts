import { CHARACTER_LIMIT } from "../constants.js";
import type {
  SpotifyTrack,
  SpotifyTrackSimplified,
  SpotifyAlbumSimplified,
  SpotifyArtist,
  SpotifyArtistSimplified,
  SpotifyPlaylist,
  SpotifyDevice,
  SpotifyEpisode,
  SpotifyShow,
  SpotifyAudiobook,
} from "../types.js";

export function truncate(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 50) + "\n\n...[Response truncated. Use pagination to see more results.]";
}

export function formatPagination(total: number, limit: number, offset: number): string {
  const hasMore = offset + limit < total;
  const nextOffset = hasMore ? offset + limit : null;
  return `\n---\nShowing ${offset + 1}-${Math.min(offset + limit, total)} of ${total}${hasMore ? ` | Next offset: ${nextOffset}` : " | End of results"}`;
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatArtistNames(artists: SpotifyArtistSimplified[]): string {
  return artists.map((a) => a.name).join(", ");
}

export function formatTrack(track: SpotifyTrack | SpotifyTrackSimplified, index?: number): string {
  const prefix = index !== undefined ? `${index + 1}. ` : "";
  const artists = formatArtistNames(track.artists);
  const duration = formatDuration(track.duration_ms);
  const explicit = track.explicit ? " [E]" : "";
  return `${prefix}**${track.name}**${explicit} - ${artists} (${duration}) \`${track.uri}\``;
}

export function formatAlbum(album: SpotifyAlbumSimplified): string {
  const artists = formatArtistNames(album.artists);
  return `**${album.name}** by ${artists} (${album.release_date}, ${album.total_tracks} tracks) \`${album.uri}\``;
}

export function formatArtist(artist: SpotifyArtist): string {
  const genres = artist.genres?.length > 0 ? ` | Genres: ${artist.genres.join(", ")}` : "";
  return `**${artist.name}**${genres} \`${artist.uri}\``;
}

export function formatPlaylist(playlist: SpotifyPlaylist): string {
  const owner = playlist.owner.display_name ?? playlist.owner.id;
  const visibility = playlist.public ? "Public" : "Private";
  const trackCount = playlist.tracks?.total ?? 0;
  return `**${playlist.name}** by ${owner} (${trackCount} tracks, ${visibility}) \`${playlist.uri}\``;
}

export function formatDevice(device: SpotifyDevice): string {
  const active = device.is_active ? " [Active]" : "";
  const volume = device.volume_percent !== null ? ` | Vol: ${device.volume_percent}%` : "";
  return `**${device.name}** (${device.type})${active}${volume}${device.id ? ` \`${device.id}\`` : ""}`;
}

export function formatEpisode(episode: SpotifyEpisode): string {
  const duration = formatDuration(episode.duration_ms);
  const showName = episode.show?.name ? ` - ${episode.show.name}` : "";
  return `**${episode.name}**${showName} (${episode.release_date}, ${duration}) \`${episode.uri}\``;
}

export function formatShow(show: SpotifyShow): string {
  return `**${show.name}** by ${show.publisher ?? "Unknown"} (${show.total_episodes} episodes) \`${show.uri}\``;
}

export function formatAudiobook(audiobook: SpotifyAudiobook): string {
  const authors = audiobook.authors.map((a) => a.name).join(", ");
  return `**${audiobook.name}** by ${authors} (${audiobook.total_chapters} chapters) \`${audiobook.uri}\``;
}

export function textContent(text: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: truncate(text) }] };
}

export function jsonContent(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return textContent(JSON.stringify(data, null, 2));
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyClient } from "../services/spotify-api.js";
import {
  playSchema,
  transferSchema,
  seekSchema,
  repeatSchema,
  volumeSchema,
  shuffleSchema,
  addToQueueSchema,
} from "../schemas/player.js";
import { deviceId } from "../schemas/common.js";
import type { SpotifyPlaybackState, SpotifyDevice, SpotifyQueue } from "../types.js";
import {
  textContent,
  formatTrack,
  formatDevice,
  formatDuration,
  formatArtistNames,
  formatEpisode,
} from "../utils/formatting.js";
import { formatToolError } from "../utils/errors.js";

const PREMIUM_NOTE = " Requires Spotify Premium.";

export function registerPlayerTools(server: McpServer, spotify: SpotifyClient): void {
  // --- Read-only tools ---

  server.registerTool(
    "spotify_get_playback_state",
    {
      title: "Get Playback State",
      description: "Get the current playback state including track, device, progress, shuffle, and repeat mode.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const state = await spotify.get<SpotifyPlaybackState | "">("/me/player");
        if (!state) return textContent("No active playback session. Start playing on a device first.");

        const item = state.item;
        const lines = ["# Current Playback\n"];

        if (item) {
          if ("album" in item) {
            lines.push(`**Track:** ${item.name}`);
            lines.push(`**Artist:** ${formatArtistNames(item.artists)}`);
            lines.push(`**Album:** ${item.album.name}`);
          } else {
            lines.push(`**Episode:** ${item.name}`);
            lines.push(`**Show:** ${item.show?.name ?? "Unknown"}`);
          }
          lines.push(`**URI:** \`${item.uri}\``);
        }

        lines.push(`\n**Device:** ${state.device.name} (${state.device.type})`);
        lines.push(`**Playing:** ${state.is_playing ? "Yes" : "Paused"}`);
        lines.push(`**Progress:** ${state.progress_ms !== null ? formatDuration(state.progress_ms) : "N/A"}${item ? ` / ${formatDuration(item.duration_ms)}` : ""}`);
        lines.push(`**Shuffle:** ${state.shuffle_state ? "On" : "Off"}`);
        lines.push(`**Repeat:** ${state.repeat_state}`);
        if (state.device.volume_percent !== null) {
          lines.push(`**Volume:** ${state.device.volume_percent}%`);
        }

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_devices",
    {
      title: "Get Available Devices",
      description: "Get a list of the user's available Spotify playback devices.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const result = await spotify.get<{ devices: SpotifyDevice[] }>("/me/player/devices");
        if (!result.devices.length) return textContent("No devices available. Open Spotify on a device first.");

        const lines = ["# Available Devices\n"];
        lines.push(...result.devices.map((d) => formatDevice(d)));
        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_currently_playing",
    {
      title: "Get Currently Playing",
      description: "Get the track or episode currently playing on the user's active device.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const state = await spotify.get<SpotifyPlaybackState | "">("/me/player/currently-playing");
        if (!state || !state.item) return textContent("Nothing is currently playing.");

        const item = state.item;
        if ("album" in item) {
          return textContent(
            `**Now Playing:** ${item.name}\n` +
            `**Artist:** ${formatArtistNames(item.artists)}\n` +
            `**Album:** ${item.album.name}\n` +
            `**Progress:** ${state.progress_ms !== null ? formatDuration(state.progress_ms) : "0:00"} / ${formatDuration(item.duration_ms)}\n` +
            `**URI:** \`${item.uri}\``
          );
        } else {
          return textContent(
            `**Now Playing:** ${item.name}\n` +
            `**Show:** ${item.show?.name ?? "Unknown"}\n` +
            `**Progress:** ${state.progress_ms !== null ? formatDuration(state.progress_ms) : "0:00"} / ${formatDuration(item.duration_ms)}\n` +
            `**URI:** \`${item.uri}\``
          );
        }
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_get_queue",
    {
      title: "Get Queue",
      description: "Get the user's current playback queue.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const queue = await spotify.get<SpotifyQueue>("/me/player/queue");
        const lines = ["# Playback Queue\n"];

        if (queue.currently_playing) {
          lines.push("## Now Playing");
          if ("album" in queue.currently_playing) {
            lines.push(formatTrack(queue.currently_playing));
          } else {
            lines.push(formatEpisode(queue.currently_playing));
          }
        }

        if (queue.queue.length) {
          lines.push("\n## Up Next");
          queue.queue.forEach((item, i) => {
            if ("album" in item) {
              lines.push(formatTrack(item, i));
            } else {
              lines.push(`${i + 1}. ${formatEpisode(item)}`);
            }
          });
        } else {
          lines.push("\nQueue is empty.");
        }

        return textContent(lines.join("\n"));
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // --- Mutation tools (Premium required) ---

  server.registerTool(
    "spotify_transfer_playback",
    {
      title: "Transfer Playback",
      description:
        "Transfer playback to a different device." + PREMIUM_NOTE,
      inputSchema: transferSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ device_id, play }) => {
      try {
        await spotify.put("/me/player", {
          device_ids: [device_id],
          ...(play !== undefined && { play }),
        });
        return textContent(`Playback transferred to device \`${device_id}\`.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_play",
    {
      title: "Play / Resume",
      description:
        "Start or resume playback. Can play a specific context (album/playlist/artist/show), " +
        "specific tracks by URI, or resume current playback with no parameters." + PREMIUM_NOTE,
      inputSchema: playSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ context_uri, uris, offset, position_ms, device_id }) => {
      try {
        const body: Record<string, unknown> = {};
        if (context_uri) body.context_uri = context_uri;
        if (uris) body.uris = uris;
        if (offset) body.offset = offset;
        if (position_ms !== undefined) body.position_ms = position_ms;

        await spotify.put("/me/player/play", Object.keys(body).length > 0 ? body : undefined, {
          params: device_id ? { device_id } : undefined,
        });
        return textContent("Playback started.");
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_pause",
    {
      title: "Pause Playback",
      description: "Pause the current playback." + PREMIUM_NOTE,
      inputSchema: { device_id: deviceId },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ device_id }) => {
      try {
        await spotify.put("/me/player/pause", undefined, {
          params: device_id ? { device_id } : undefined,
        });
        return textContent("Playback paused.");
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_skip_next",
    {
      title: "Skip to Next",
      description: "Skip to the next track in queue." + PREMIUM_NOTE,
      inputSchema: { device_id: deviceId },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ device_id }) => {
      try {
        await spotify.post("/me/player/next", undefined, {
          params: device_id ? { device_id } : undefined,
        });
        return textContent("Skipped to next track.");
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_skip_previous",
    {
      title: "Skip to Previous",
      description: "Skip to the previous track." + PREMIUM_NOTE,
      inputSchema: { device_id: deviceId },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ device_id }) => {
      try {
        await spotify.post("/me/player/previous", undefined, {
          params: device_id ? { device_id } : undefined,
        });
        return textContent("Skipped to previous track.");
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_seek",
    {
      title: "Seek to Position",
      description: "Seek to a position in the currently playing track." + PREMIUM_NOTE,
      inputSchema: seekSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ position_ms, device_id }) => {
      try {
        await spotify.put("/me/player/seek", undefined, {
          params: { position_ms, ...(device_id && { device_id }) },
        });
        return textContent(`Seeked to ${formatDuration(position_ms)}.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_set_repeat",
    {
      title: "Set Repeat Mode",
      description:
        "Set the repeat mode: 'off', 'context' (repeat playlist/album), or 'track' (repeat single track)." + PREMIUM_NOTE,
      inputSchema: repeatSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ state, device_id }) => {
      try {
        await spotify.put("/me/player/repeat", undefined, {
          params: { state, ...(device_id && { device_id }) },
        });
        return textContent(`Repeat mode set to '${state}'.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_set_volume",
    {
      title: "Set Volume",
      description: "Set the playback volume (0-100)." + PREMIUM_NOTE,
      inputSchema: volumeSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ volume_percent, device_id }) => {
      try {
        await spotify.put("/me/player/volume", undefined, {
          params: { volume_percent, ...(device_id && { device_id }) },
        });
        return textContent(`Volume set to ${volume_percent}%.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_set_shuffle",
    {
      title: "Set Shuffle",
      description: "Toggle shuffle mode on or off." + PREMIUM_NOTE,
      inputSchema: shuffleSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ state, device_id }) => {
      try {
        await spotify.put("/me/player/shuffle", undefined, {
          params: { state, ...(device_id && { device_id }) },
        });
        return textContent(`Shuffle ${state ? "enabled" : "disabled"}.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    "spotify_add_to_queue",
    {
      title: "Add to Queue",
      description: "Add a track or episode to the playback queue." + PREMIUM_NOTE,
      inputSchema: addToQueueSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ uri, device_id }) => {
      try {
        await spotify.post("/me/player/queue", undefined, {
          params: { uri, ...(device_id && { device_id }) },
        });
        return textContent(`Added \`${uri}\` to queue.`);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

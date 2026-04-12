import { z } from "zod";
import { deviceId } from "./common.js";

export const playSchema = {
  context_uri: z
    .string()
    .optional()
    .describe(
      "Spotify URI of context to play (album, artist, playlist, show). Example: spotify:album:1Je1IMUlBXcx1Fz0WE7oPT",
    ),
  uris: z
    .array(z.string())
    .optional()
    .describe(
      "Array of Spotify track/episode URIs to play. Example: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh']",
    ),
  offset: z
    .union([
      z.object({
        position: z.number().int().min(0).describe("Zero-based track position in context"),
      }),
      z.object({
        uri: z.string().describe("URI of the item in context to start at"),
      }),
    ])
    .optional()
    .describe("Where in the context to start playback"),
  position_ms: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Position in milliseconds to seek to"),
  device_id: deviceId,
};

export const transferSchema = {
  device_id: z.string().describe("Device ID to transfer playback to"),
  play: z
    .boolean()
    .optional()
    .describe("If true, ensure playback happens on new device (default: keeps current state)"),
};

export const seekSchema = {
  position_ms: z.number().int().min(0).describe("Position in milliseconds to seek to"),
  device_id: deviceId,
};

export const repeatSchema = {
  state: z
    .enum(["off", "context", "track"])
    .describe("Repeat mode: 'off', 'context' (repeat playlist/album), or 'track' (repeat single track)"),
  device_id: deviceId,
};

export const volumeSchema = {
  volume_percent: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Volume level (0-100)"),
  device_id: deviceId,
};

export const shuffleSchema = {
  state: z.boolean().describe("true to enable shuffle, false to disable"),
  device_id: deviceId,
};

export const addToQueueSchema = {
  uri: z
    .string()
    .describe(
      "Spotify URI of track or episode to add to queue. Example: spotify:track:4iV5W9uYEdYUVa79Axb7Rh",
    ),
  device_id: deviceId,
};

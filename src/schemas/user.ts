import { z } from "zod";

export const getFollowedArtistsSchema = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of items to return (default: 20, max: 50)"),
  after: z
    .string()
    .optional()
    .describe("Cursor: the last artist ID from the previous page"),
};

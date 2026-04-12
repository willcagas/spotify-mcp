import axios, { AxiosError } from "axios";

export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public suggestion: string,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

export function classifyError(error: unknown): SpotifyApiError {
  if (error instanceof SpotifyApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: { message?: string } }>;
    const status = axiosError.response?.status ?? 0;
    const spotifyMessage =
      axiosError.response?.data?.error?.message ?? axiosError.message;

    switch (status) {
      case 401:
        return new SpotifyApiError(
          `Authentication failed: ${spotifyMessage}`,
          401,
          "Token may have expired. The server will attempt to refresh automatically. If this persists, re-authenticate by restarting the server.",
        );
      case 403:
        return new SpotifyApiError(
          `Forbidden: ${spotifyMessage}`,
          403,
          "This may require Spotify Premium, additional OAuth scopes, or the endpoint may be deprecated for your app. Check the tool description for requirements.",
        );
      case 404:
        return new SpotifyApiError(
          `Not found: ${spotifyMessage}`,
          404,
          "Verify the Spotify ID or URI is correct. The resource may have been removed or may not be available in your market.",
        );
      case 429:
        return new SpotifyApiError(
          `Rate limited: ${spotifyMessage}`,
          429,
          "Too many requests. The server will retry automatically with backoff.",
        );
      default:
        return new SpotifyApiError(
          `Spotify API error (${status}): ${spotifyMessage}`,
          status,
          "An unexpected error occurred. Check the Spotify API status page if this persists.",
        );
    }
  }

  const message =
    error instanceof Error ? error.message : "An unknown error occurred";
  return new SpotifyApiError(message, 0, "Check server logs for details.");
}

export function formatToolError(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const classified = classifyError(error);
  return {
    content: [
      {
        type: "text",
        text: `Error: ${classified.message}\n\nSuggestion: ${classified.suggestion}`,
      },
    ],
    isError: true,
  };
}

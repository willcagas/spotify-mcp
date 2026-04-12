import { randomBytes, createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import open from "open";
import axios from "axios";
import {
  SPOTIFY_AUTH_URL,
  SPOTIFY_TOKEN_URL,
  SCOPES,
  TOKEN_REFRESH_BUFFER_MS,
} from "../constants.js";
import type { TokenData } from "../types.js";

const CONFIG_DIR = join(homedir(), ".spotify-mcp");
const TOKEN_FILE = join(CONFIG_DIR, "tokens.json");

type RedirectConfig = {
  redirectUri: string;
  listenHost: string;
  listenPort: number;
  callbackPath: string;
};

function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  return base64url(randomBytes(64));
}

function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64url(hash);
}

export class TokenManager {
  private tokens: TokenData | null = null;
  private clientId: string;
  private clientSecret: string | undefined;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        "SPOTIFY_CLIENT_ID environment variable is required. " +
          "Create a Spotify app at https://developer.spotify.com/dashboard",
      );
    }
    this.clientId = clientId;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  }

  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      this.tokens = await this.loadTokens();
    }

    if (!this.tokens) {
      await this.authenticate();
      if (!this.tokens) {
        throw new Error(
          "Authentication failed. Restart the server to try again.",
        );
      }
    }

    if (Date.now() >= this.tokens.expires_at - TOKEN_REFRESH_BUFFER_MS) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  async authenticate(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = base64url(randomBytes(16));

    const configuredRedirect = process.env.SPOTIFY_REDIRECT_URI?.trim();
    let redirectConfig: RedirectConfig;
    let authCodePromise: Promise<string>;

    if (configuredRedirect) {
      redirectConfig = this.parseRedirectUri(configuredRedirect);
      const { authCode } = await this.startCallbackServer(
        state,
        redirectConfig.listenHost,
        redirectConfig.listenPort,
        redirectConfig.callbackPath,
      );
      authCodePromise = authCode;
    } else {
      const callbackPath = "/callback";
      const { port, authCode } = await this.startCallbackServer(state, "127.0.0.1", 0, callbackPath);
      redirectConfig = {
        redirectUri: `http://127.0.0.1:${port}${callbackPath}`,
        listenHost: "127.0.0.1",
        listenPort: port,
        callbackPath,
      };
      authCodePromise = authCode;
    }

    const redirectUri = redirectConfig.redirectUri;

    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    });

    const authUrl = `${SPOTIFY_AUTH_URL}?${authParams.toString()}`;
    process.stderr.write(
      `\nOpening browser for Spotify authentication...\n` +
        `If the browser doesn't open, visit:\n${authUrl}\n\n`,
    );
    await open(authUrl);

    const code = await authCodePromise;
    await this.exchangeCode(code, codeVerifier, redirectUri);
  }

  private parseRedirectUri(redirectUri: string): RedirectConfig {
    let parsed: URL;
    try {
      parsed = new URL(redirectUri);
    } catch {
      throw new Error(
        "SPOTIFY_REDIRECT_URI is invalid. Expected format like http://127.0.0.1:8888/callback",
      );
    }

    if (parsed.protocol !== "http:") {
      throw new Error(
        "SPOTIFY_REDIRECT_URI must use http for loopback addresses.",
      );
    }

    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "::1") {
      throw new Error(
        "SPOTIFY_REDIRECT_URI must use a loopback IP literal (127.0.0.1 or ::1).",
      );
    }

    if (!parsed.port) {
      throw new Error(
        "SPOTIFY_REDIRECT_URI must include an explicit port, e.g. http://127.0.0.1:8888/callback",
      );
    }

    return {
      redirectUri,
      listenHost: parsed.hostname,
      listenPort: Number(parsed.port),
      callbackPath: parsed.pathname || "/",
    };
  }

  private startCallbackServer(
    expectedState: string,
    host: string,
    listenPort: number,
    callbackPath: string,
  ): Promise<{ port: number; authCode: Promise<string> }> {
    return new Promise((resolveServer) => {
      let resolveCode: (code: string) => void;
      let rejectCode: (error: Error) => void;
      const authCode = new Promise<string>((resolve, reject) => {
        resolveCode = resolve;
        rejectCode = reject;
      });

      const server = createServer(
        (req: IncomingMessage, res: ServerResponse) => {
          const url = new URL(req.url ?? "/", `http://127.0.0.1`);

          if (url.pathname !== callbackPath) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }

          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          const error = url.searchParams.get("error");

          if (error) {
            res.writeHead(400);
            res.end(`Authentication error: ${error}`);
            rejectCode(new Error(`Spotify auth error: ${error}`));
            server.close();
            return;
          }

          if (state !== expectedState) {
            res.writeHead(400);
            res.end("State mismatch — possible CSRF attack.");
            rejectCode(new Error("State mismatch in OAuth callback"));
            server.close();
            return;
          }

          if (!code) {
            res.writeHead(400);
            res.end("No authorization code received.");
            rejectCode(new Error("No authorization code in callback"));
            server.close();
            return;
          }

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h2>Authentication successful!</h2>" +
              "<p>You can close this tab and return to your terminal.</p></body></html>",
          );
          resolveCode(code);
          server.close();
        },
      );

      // Bind to explicit port when configured, or use 0 for dynamic assignment.
      server.listen(listenPort, host, () => {
        const addr = server.address();
        const port =
          typeof addr === "object" && addr !== null ? addr.port : 0;
        process.stderr.write(
          `Auth callback server listening on http://${host}:${port}${callbackPath}\n`,
        );
        resolveServer({ port, authCode });
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        rejectCode(
          new Error(
            "Authentication timed out after 2 minutes. Restart the server to try again.",
          ),
        );
        server.close();
      }, 120_000);
    });
  }

  private async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<void> {
    const params: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // If client secret is provided, use it (Authorization Code flow)
    if (this.clientSecret) {
      headers["Authorization"] =
        "Basic " +
        Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
          "base64",
        );
    }

    const response = await axios.post(
      SPOTIFY_TOKEN_URL,
      new URLSearchParams(params).toString(),
      { headers },
    );

    this.tokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: Date.now() + response.data.expires_in * 1000,
    };

    await this.saveTokens();
    process.stderr.write("Authentication successful! Tokens saved.\n");
  }

  private async refreshToken(): Promise<void> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error(
        "No refresh token available. Restart the server to re-authenticate.",
      );
    }

    const params: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: this.tokens.refresh_token,
      client_id: this.clientId,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (this.clientSecret) {
      headers["Authorization"] =
        "Basic " +
        Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
          "base64",
        );
    }

    try {
      const response = await axios.post(
        SPOTIFY_TOKEN_URL,
        new URLSearchParams(params).toString(),
        { headers },
      );

      this.tokens = {
        access_token: response.data.access_token,
        refresh_token:
          response.data.refresh_token ?? this.tokens.refresh_token,
        expires_at: Date.now() + response.data.expires_in * 1000,
      };

      await this.saveTokens();
      process.stderr.write("Token refreshed successfully.\n");
    } catch {
      // Clear invalid tokens so next call triggers re-auth
      this.tokens = null;
      throw new Error(
        "Token refresh failed. Restart the server to re-authenticate.",
      );
    }
  }

  private async loadTokens(): Promise<TokenData | null> {
    try {
      const data = await readFile(TOKEN_FILE, "utf-8");
      return JSON.parse(data) as TokenData;
    } catch {
      return null;
    }
  }

  private async saveTokens(): Promise<void> {
    if (!this.tokens) return;
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(TOKEN_FILE, JSON.stringify(this.tokens, null, 2), {
      mode: 0o600,
    });
  }
}

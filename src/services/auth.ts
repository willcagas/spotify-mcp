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

    const { port, authCode } = await this.startCallbackServer(state);

    const redirectUri = `http://127.0.0.1:${port}/callback`;

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

    const code = await authCode;
    await this.exchangeCode(code, codeVerifier, redirectUri);
  }

  private startCallbackServer(
    expectedState: string,
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

          if (url.pathname !== "/callback") {
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

      // Bind to port 0 on 127.0.0.1 for dynamic port assignment
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        const port =
          typeof addr === "object" && addr !== null ? addr.port : 0;
        process.stderr.write(
          `Auth callback server listening on http://127.0.0.1:${port}/callback\n`,
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

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { SPOTIFY_API_BASE, MAX_RETRY_ATTEMPTS } from "../constants.js";
import type { TokenManager } from "./auth.js";
import { SpotifyApiError } from "../utils/errors.js";

export class SpotifyClient {
  private client: AxiosInstance;
  private tokenManager: TokenManager;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;

    this.client = axios.create({
      baseURL: SPOTIFY_API_BASE,
      timeout: 30_000,
      headers: {
        Accept: "application/json",
      },
    });

    // Request interceptor: attach auth token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.tokenManager.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
    );

    // Response interceptor: handle rate limits and auth errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (!axios.isAxiosError(error) || !error.config) {
          throw error;
        }

        const config = error.config as InternalAxiosRequestConfig & {
          _retryCount?: number;
        };
        const status = error.response?.status;

        // Handle 401: try refreshing token once
        if (status === 401 && !config._retryCount) {
          config._retryCount = 1;
          // Force a token refresh by getting a new token
          const token = await this.tokenManager.getAccessToken();
          config.headers.Authorization = `Bearer ${token}`;
          return this.client.request(config);
        }

        // Handle 429: rate limit with retry
        if (status === 429) {
          const retryCount = config._retryCount ?? 0;
          if (retryCount >= MAX_RETRY_ATTEMPTS) {
            throw new SpotifyApiError(
              "Rate limit exceeded after maximum retries",
              429,
              "Wait a moment before making more requests.",
            );
          }

          const retryAfter = parseInt(
            error.response?.headers?.["retry-after"] ?? "1",
            10,
          );
          const delay = retryAfter * 1000 * Math.pow(2, retryCount);

          process.stderr.write(
            `Rate limited. Retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...\n`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          config._retryCount = retryCount + 1;
          return this.client.request(config);
        }

        throw error;
      },
    );
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(path, { params });
    return response.data;
  }

  async post<T>(
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.post<T>(path, data, config);
    return response.data;
  }

  async put<T>(
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.put<T>(path, data, config);
    return response.data;
  }

  async delete<T>(
    path: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.delete<T>(path, config);
    return response.data;
  }
}

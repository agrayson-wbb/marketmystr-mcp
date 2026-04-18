/**
 * Thin wrapper around fetch for GoHighLevel API calls.
 * Handles auth headers, base URL, error normalization.
 */

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

export interface GHLClientOptions {
  pit: string; // Private Integration Token (e.g., "pit-...")
  locationId: string;
}

export class GHLClient {
  private pit: string;
  public locationId: string;

  constructor(options: GHLClientOptions) {
    this.pit = options.pit;
    this.locationId = options.locationId;
  }

  async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${GHL_BASE_URL}${endpoint}`);

    // Add caller-provided query params only (no auto-append of locationId)
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.pit}`,
      Version: GHL_API_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json"
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), options);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json() as any;
          if (errorData.message) {
            errorMessage = `${errorMessage}: ${errorData.message}`;
          } else if (errorData.error) {
            errorMessage = `${errorMessage}: ${errorData.error}`;
          }
        } catch {
          // Response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`GHL API error: ${error.message}`);
      }
      throw error;
    }
  }
}

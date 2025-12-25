type Env = {
  /**
   * Base URL for backend calls.
   * - In dev (with Vite proxy), you can keep this empty "" and call "/datasets/..."
   * - In prod, set VITE_API_BASE_URL to your deployed backend origin (e.g., https://api.example.com)
   */
  API_BASE_URL: string;

  /**
   * Request timeout in ms for API calls
   */
  API_TIMEOUT_MS: number;
};

function readNumber(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env: Env = {
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL ?? "").toString().trim(),
  API_TIMEOUT_MS: readNumber(import.meta.env.VITE_API_TIMEOUT_MS, 30000),
};

/**
 * Helper: build a full URL using API_BASE_URL when present.
 * If API_BASE_URL is empty, returns a relative path (good for dev proxy).
 */
export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  const base = env.API_BASE_URL;
  if (!base) return path;

  // Avoid double slashes
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${trimmed}${path}`;
}

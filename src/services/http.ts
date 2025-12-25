import { env, apiUrl } from "../config/env";
import { toUserErrorMessage, tryParseApiError } from "../utils/errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpOptions = {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  body?: any;
  /**
   * If true, body is sent as-is (useful for FormData upload).
   * When false/undefined, body is JSON-stringified and Content-Type set.
   */
  rawBody?: boolean;
  timeoutMs?: number;
};

export type HttpError = Error & {
  status?: number;
  code?: string;
  traceId?: string;
  details?: any;
};

function buildQuery(query?: HttpOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function mergeHeaders(a?: Record<string, string>, b?: Record<string, string>): Record<string, string> {
  return { ...(a ?? {}), ...(b ?? {}) };
}

export class HttpClient {
  private defaultHeaders: Record<string, string>;

  constructor(defaultHeaders?: Record<string, string>) {
    this.defaultHeaders = defaultHeaders ?? {};
  }

  async request<T>(opts: HttpOptions): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), opts.timeoutMs ?? env.API_TIMEOUT_MS);

    const url = apiUrl(opts.path) + buildQuery(opts.query);

    const headers = mergeHeaders(this.defaultHeaders, opts.headers);

    let body: BodyInit | undefined = undefined;

    if (opts.body !== undefined && opts.body !== null) {
      if (opts.rawBody) {
        body = opts.body as BodyInit;
        // For FormData, do NOT set Content-Type manually
      } else {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
        body = JSON.stringify(opts.body);
      }
    }

    try {
      const res = await fetch(url, {
        method: opts.method,
        headers,
        body,
        signal: controller.signal,
      });

      // Try to parse JSON response if any
      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      if (!res.ok) {
        let payload: any = null;
        try {
          payload = isJson ? await res.json() : await res.text();
        } catch {
          payload = null;
        }

        const apiErr = tryParseApiError(payload);
        const err: HttpError = new Error(toUserErrorMessage(apiErr, res.status));
        err.status = res.status;
        err.code = apiErr?.code;
        err.traceId = apiErr?.trace_id;
        err.details = apiErr?.details;
        throw err;
      }

      if (!isJson) {
        // some endpoints might return plain text; still allow as unknown
        const txt = await res.text();
        return txt as unknown as T;
      }

      return (await res.json()) as T;
    } catch (e: any) {
      // Abort -> timeout
      if (e?.name === "AbortError") {
        const err: HttpError = new Error("Request timed out. Please try again.");
        err.status = 408;
        throw err;
      }
      // Re-throw HttpError as-is
      if (e instanceof Error) throw e;
      const err: HttpError = new Error("Network error. Please check your connection.");
      throw err;
    } finally {
      window.clearTimeout(timeout);
    }
  }
}

export const http = new HttpClient();

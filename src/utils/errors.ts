type ApiErrorShape = {
  message: string;
  code: string;
  trace_id: string;
  details?: any;
};

export function tryParseApiError(payload: any): ApiErrorShape | null {
  if (!payload || typeof payload !== "object") return null;

  // Backend sends: { message, code, trace_id, details? }
  const msg = (payload as any).message;
  const code = (payload as any).code;
  const traceId = (payload as any).trace_id;

  if (typeof msg === "string" && typeof code === "string" && typeof traceId === "string") {
    return {
      message: msg,
      code,
      trace_id: traceId,
      details: (payload as any).details,
    };
  }

  return null;
}

export function toUserErrorMessage(apiErr: ApiErrorShape | null, status?: number): string {
  if (apiErr?.message) {
    // Keep it clean for users; trace id can be shown in details if needed later
    return apiErr.message;
  }

  // Fallback messages by status
  if (status === 404) return "Not found.";
  if (status === 408) return "Request timed out. Please try again.";
  if (status === 413) return "File is too large. Please upload a smaller file.";
  if (status === 422) return "Invalid input. Please check the form and try again.";
  if (status && status >= 500) return "Server error. Please try again later.";

  return "Something went wrong. Please try again.";
}

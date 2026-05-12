export type EndpointErrorType =
  | "none"
  | "missing_api_key"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "invalid_response"
  | "unknown";

export type EndpointStatus = {
  name: string;
  endpoint: string;
  ok: boolean;
  status?: number;
  statusText?: string;
  errorType: EndpointErrorType;
  message: string;
  durationMs?: number;
  itemCount?: number;
};

export type DataSourceState = {
  mode: "live" | "partial" | "unavailable";
  endpoints: EndpointStatus[];
  updatedAt: string;
};

export type EndpointResult<T> =
  | {
      ok: true;
      data: T;
      status: EndpointStatus;
    }
  | {
      ok: false;
      status: EndpointStatus;
    };

export function errorTypeFromHttpStatus(status: number): EndpointErrorType {
  if (status >= 200 && status < 300) {
    return "none";
  }

  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 404) {
    return "not_found";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status >= 500) {
    return "server_error";
  }

  return "unknown";
}
export function dataSourceMode({
  endpoints,
  usefulItemCount,
}: {
  endpoints: EndpointStatus[];
  usefulItemCount: number;
}): DataSourceState["mode"] {
  const successfulEndpoints = endpoints.filter((endpoint) => endpoint.ok);

  if (successfulEndpoints.length === 0) {
    return "unavailable";
  }

  if (usefulItemCount <= 0) {
    return "partial";
  }

  return endpoints.every((endpoint) => endpoint.ok) ? "live" : "partial";
}

export function responseShapeSummary(value: unknown) {
  if (Array.isArray(value)) {
    return `array length: ${value.length}`;
  }

  if (typeof value === "object" && value !== null) {
    return `object keys: ${Object.keys(value).slice(0, 8).join(",")}`;
  }

  return typeof value;
}

export function logEndpointStatus({
  status,
  url,
  shape,
}: {
  status: EndpointStatus;
  url?: string;
  shape?: string;
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const lines = [
    `[SoNarr SoSoValue] ${status.name}${status.ok ? "" : " failed"}`,
    `endpoint: ${status.endpoint}`,
    url ? `url: ${url}` : undefined,
    status.status ? `status: ${status.status}` : undefined,
    status.durationMs !== undefined ? `durationMs: ${status.durationMs}` : undefined,
    status.itemCount !== undefined ? `itemCount: ${status.itemCount}` : undefined,
    shape ? `shape: ${shape}` : undefined,
    status.errorType !== "none" ? `errorType: ${status.errorType}` : undefined,
    `message: ${status.message}`,
  ].filter(Boolean);

  console.log(lines.join("\n"));
}

import {
  errorTypeFromHttpStatus,
  logEndpointStatus,
  responseShapeSummary,
  type EndpointResult,
  type EndpointStatus,
} from "@/lib/types/data-source";

type UnknownRecord = Record<string, unknown>;

export function getSoSoValueBaseUrl() {
  return (
    process.env.SOSOVALUE_API_BASE_URL ?? "https://openapi.sosovalue.com/api/v1"
  ).replace(/\/$/, "");
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function responsePayload(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const code = asNumber(value.code);
  if (code !== undefined && code !== 0) {
    return undefined;
  }

  if (Array.isArray(value.data)) {
    return value.data;
  }

  return isRecord(value.data) ? value.data : value;
}

export function responseRecord(value: unknown): UnknownRecord | undefined {
  const payload = responsePayload(value);
  return isRecord(payload) ? payload : undefined;
}

export function responseList(value: unknown): unknown[] {
  const payload = responsePayload(value);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.list)) {
    return payload.list;
  }

  if (isRecord(value) && Array.isArray(value.list)) {
    return value.list;
  }

  return [];
}

export async function requestSoSoValue(
  path: string,
  name: string,
  options: { revalidate?: number; query?: Record<string, string> } = {},
): Promise<EndpointResult<unknown>> {
  const startedAt = Date.now();
  const endpoint = `GET ${path.split("?")[0]}`;
  const apiKey = process.env.SOSOVALUE_API_KEY;
  const url = new URL(`${getSoSoValueBaseUrl()}${path}`);

  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  if (!apiKey) {
    const status: EndpointStatus = {
      name,
      endpoint,
      ok: false,
      errorType: "missing_api_key",
      message: "Missing SOSOVALUE_API_KEY. Add the key to enable live SoSoValue data.",
      durationMs: Date.now() - startedAt,
      itemCount: 0,
    };
    logEndpointStatus({ status, url: url.toString() });
    return { ok: false, status };
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-soso-api-key": apiKey,
      },
      next: { revalidate: options.revalidate ?? 60 },
    });
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const status: EndpointStatus = {
        name,
        endpoint,
        ok: false,
        status: response.status,
        statusText: response.statusText,
        errorType: errorTypeFromHttpStatus(response.status),
        message: `SoSoValue returned ${response.status} ${response.statusText || ""}`.trim(),
        durationMs,
        itemCount: 0,
      };
      logEndpointStatus({ status, url: url.toString() });
      return { ok: false, status };
    }

    try {
      const data: unknown = await response.json();
      const apiCode = isRecord(data) ? asNumber(data.code) : undefined;

      if (apiCode !== undefined && apiCode !== 0) {
        const status: EndpointStatus = {
          name,
          endpoint,
          ok: false,
          status: response.status,
          statusText: response.statusText,
          errorType: "invalid_response",
          message: asString(isRecord(data) ? data.message : undefined) ?? "SoSoValue returned an error code.",
          durationMs,
          itemCount: 0,
        };
        logEndpointStatus({ status, url: url.toString() });
        return { ok: false, status };
      }

      const status: EndpointStatus = {
        name,
        endpoint,
        ok: true,
        status: response.status,
        statusText: response.statusText,
        errorType: "none",
        message: "SoSoValue endpoint responded successfully.",
        durationMs,
      };
      logEndpointStatus({
        status,
        url: url.toString(),
        shape: responseShapeSummary(data),
      });
      return { ok: true, data, status };
    } catch {
      const status: EndpointStatus = {
        name,
        endpoint,
        ok: false,
        status: response.status,
        statusText: response.statusText,
        errorType: "invalid_response",
        message: "SoSoValue response could not be parsed as JSON.",
        durationMs,
        itemCount: 0,
      };
      logEndpointStatus({ status, url: url.toString() });
      return { ok: false, status };
    }
  } catch {
    const status: EndpointStatus = {
      name,
      endpoint,
      ok: false,
      errorType: "network_error",
      message: "Network error while contacting SoSoValue.",
      durationMs: Date.now() - startedAt,
      itemCount: 0,
    };
    logEndpointStatus({ status, url: url.toString() });
    return { ok: false, status };
  }
}

export function normalizeSymbolToken(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

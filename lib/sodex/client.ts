import {
  errorTypeFromHttpStatus,
  type EndpointResult,
  type EndpointStatus,
} from "@/lib/types/data-source";

import { getSodexBaseUrl } from "./config";

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
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

export async function requestSodexGet<T>(
  path: string,
  name: string,
  parse: (payload: unknown) => T | undefined,
  revalidate = 30,
): Promise<EndpointResult<T>> {
  const startedAt = Date.now();
  const endpoint = `GET ${path.split("?")[0]}`;
  const url = `${getSodexBaseUrl()}${path}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        ok: false,
        status: {
          name,
          endpoint,
          ok: false,
          status: response.status,
          statusText: response.statusText,
          errorType: errorTypeFromHttpStatus(response.status),
          message: `SoDEX returned ${response.status} ${response.statusText || ""}`.trim(),
          durationMs,
          itemCount: 0,
        },
      };
    }

    const body: unknown = await response.json();

    if (!isRecord(body) || asNumber(body.code) !== 0) {
      return {
        ok: false,
        status: {
          name,
          endpoint,
          ok: false,
          status: response.status,
          statusText: response.statusText,
          errorType: "invalid_response",
          message:
            asString(isRecord(body) ? body.error : undefined) ??
            asString(isRecord(body) ? body.message : undefined) ??
            "SoDEX returned a non-zero code.",
          durationMs,
          itemCount: 0,
        },
      };
    }

    const parsed = parse(body.data);

    if (parsed === undefined) {
      return {
        ok: false,
        status: {
          name,
          endpoint,
          ok: false,
          status: response.status,
          statusText: response.statusText,
          errorType: "invalid_response",
          message: "SoDEX response shape was incompatible with the parser.",
          durationMs,
          itemCount: 0,
        },
      };
    }

    const itemCount = Array.isArray(parsed) ? parsed.length : 1;

    return {
      ok: true,
      data: parsed,
      status: {
        name,
        endpoint,
        ok: true,
        status: response.status,
        statusText: response.statusText,
        errorType: "none",
        message: "SoDEX endpoint responded successfully.",
        durationMs,
        itemCount,
      },
    };
  } catch {
    return {
      ok: false,
      status: {
        name,
        endpoint,
        ok: false,
        errorType: "network_error",
        message: "Network error while contacting SoDEX.",
        durationMs: Date.now() - startedAt,
        itemCount: 0,
      },
    };
  }
}

export async function requestSodexPost<T>(
  path: string,
  name: string,
  body: string,
  headers: Record<string, string>,
): Promise<{ ok: true; data: T } | { ok: false; status: EndpointStatus; error?: string }> {
  const startedAt = Date.now();
  const endpoint = `POST ${path.split("?")[0]}`;
  const url = `${getSodexBaseUrl()}${path}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      body,
      cache: "no-store",
    });
    const durationMs = Date.now() - startedAt;
    const payload: unknown = await response.json().catch(() => undefined);
    const code = isRecord(payload) ? asNumber(payload.code) : undefined;

    if (!response.ok || code !== 0) {
      return {
        ok: false,
        status: {
          name,
          endpoint,
          ok: false,
          status: response.status,
          statusText: response.statusText,
          errorType: code === undefined ? errorTypeFromHttpStatus(response.status) : "invalid_response",
          message:
            asString(isRecord(payload) ? payload.error : undefined) ??
            asString(isRecord(payload) ? payload.message : undefined) ??
            `SoDEX trade request failed (${response.status}).`,
          durationMs,
          itemCount: 0,
        },
        error: asString(isRecord(payload) ? payload.error : undefined),
      };
    }

    return {
      ok: true,
      data: (isRecord(payload) ? payload.data : payload) as T,
    };
  } catch {
    return {
      ok: false,
      status: {
        name,
        endpoint,
        ok: false,
        errorType: "network_error",
        message: "Network error while submitting to SoDEX.",
        durationMs: Date.now() - startedAt,
        itemCount: 0,
      },
    };
  }
}

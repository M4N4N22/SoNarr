/**
 * Durable JSON key-value store for lifecycle snapshots and trade journals.
 * Prefers Upstash Redis REST when configured; falls back to local filesystem.
 * Ephemeral hosts without Upstash still work for demos via the file fallback.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type KvBackend = "upstash" | "filesystem";

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    return undefined;
  }
  return { url: url.replace(/\/$/, ""), token };
}

export function getKvBackend(): KvBackend {
  return upstashConfig() ? "upstash" : "filesystem";
}

async function upstashCommand(command: unknown[]) {
  const config = upstashConfig();
  if (!config) {
    return undefined;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash command failed (${response.status}).`);
  }

  const payload = (await response.json()) as { result?: unknown };
  return payload.result;
}

function filePathForKey(key: string) {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(process.cwd(), "data", "kv", `${safe}.json`);
}

async function readFileJson<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await readFile(filePathForKey(key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function writeFileJson(key: string, value: unknown) {
  const filePath = filePathForKey(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export async function kvGetJson<T>(key: string): Promise<T | undefined> {
  const config = upstashConfig();
  if (config) {
    try {
      const result = await upstashCommand(["GET", key]);
      if (typeof result !== "string" || !result) {
        return undefined;
      }
      return JSON.parse(result) as T;
    } catch {
      return undefined;
    }
  }

  return readFileJson<T>(key);
}

export async function kvSetJson(key: string, value: unknown): Promise<{ backend: KvBackend }> {
  const config = upstashConfig();
  if (config) {
    await upstashCommand(["SET", key, JSON.stringify(value)]);
    return { backend: "upstash" };
  }

  try {
    await writeFileJson(key, value);
    return { backend: "filesystem" };
  } catch {
    // Ephemeral hosts may reject writes; callers still keep in-memory value.
    return { backend: "filesystem" };
  }
}

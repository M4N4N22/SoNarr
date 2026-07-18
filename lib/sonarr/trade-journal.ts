import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type TradeJournalFill = {
  symbol?: string;
  status?: string;
  side?: string;
  price?: number;
  quantity?: number;
  filledQuantity?: number;
  clOrdId?: string;
};

export type TradeJournalEntry = {
  id: string;
  at: string;
  narrativeId: string;
  narrativeTitle: string;
  wallet?: string;
  submittedLegs: number;
  successLegs: number;
  message: string;
  fills: TradeJournalFill[];
};

export type TradeJournal = {
  updatedAt: string;
  entries: TradeJournalEntry[];
};

const DATA_DIR = path.join(process.cwd(), "data", "trade-journal");
const STORE_PATH = path.join(DATA_DIR, "journal.json");

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readTradeJournal(): Promise<TradeJournal> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as TradeJournal;
    if (!parsed || !Array.isArray(parsed.entries)) {
      return { updatedAt: new Date().toISOString(), entries: [] };
    }
    return parsed;
  } catch {
    return { updatedAt: new Date().toISOString(), entries: [] };
  }
}

export async function appendTradeJournalEntry(
  entry: Omit<TradeJournalEntry, "id" | "at"> & { id?: string; at?: string },
): Promise<TradeJournal> {
  const journal = await readTradeJournal();
  const next: TradeJournalEntry = {
    id: entry.id ?? `tj-${Date.now()}`,
    at: entry.at ?? new Date().toISOString(),
    narrativeId: entry.narrativeId,
    narrativeTitle: entry.narrativeTitle,
    wallet: entry.wallet,
    submittedLegs: entry.submittedLegs,
    successLegs: entry.successLegs,
    message: entry.message,
    fills: entry.fills,
  };

  const entries = [next, ...journal.entries].slice(0, 100);
  const updated: TradeJournal = {
    updatedAt: next.at,
    entries,
  };

  try {
    await ensureDir();
    await writeFile(STORE_PATH, JSON.stringify(updated, null, 2), "utf8");
  } catch {
    // Ephemeral hosts may reject writes.
  }

  return updated;
}

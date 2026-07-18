import { kvGetJson, kvSetJson } from "@/lib/persistence/kv-store";

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
  network?: string;
  submittedLegs: number;
  successLegs: number;
  message: string;
  fills: TradeJournalFill[];
};

export type TradeJournal = {
  updatedAt: string;
  entries: TradeJournalEntry[];
  persistenceBackend?: "upstash" | "filesystem";
};

const JOURNAL_KEY = "sonarr:trade-journal";

export async function readTradeJournal(): Promise<TradeJournal> {
  const parsed = await kvGetJson<TradeJournal>(JOURNAL_KEY);
  if (!parsed || !Array.isArray(parsed.entries)) {
    return { updatedAt: new Date().toISOString(), entries: [] };
  }
  return parsed;
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
    network: entry.network,
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

  const { backend } = await kvSetJson(JOURNAL_KEY, updated);
  updated.persistenceBackend = backend;
  return updated;
}

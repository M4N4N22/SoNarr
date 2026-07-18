import { appendTradeJournalEntry, readTradeJournal } from "@/lib/sonarr/trade-journal";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const narrativeId = searchParams.get("narrativeId");
  const journal = await readTradeJournal();

  if (!narrativeId) {
    return Response.json(journal);
  }

  return Response.json({
    ...journal,
    entries: journal.entries.filter((entry) => entry.narrativeId === narrativeId),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const {
    narrativeId,
    narrativeTitle,
    wallet,
    network,
    submittedLegs,
    successLegs,
    message,
    fills,
  } = body;

  if (
    typeof narrativeId !== "string" ||
    typeof narrativeTitle !== "string" ||
    typeof submittedLegs !== "number" ||
    typeof successLegs !== "number" ||
    typeof message !== "string" ||
    !Array.isArray(fills)
  ) {
    return Response.json({ error: "Invalid trade journal entry." }, { status: 400 });
  }

  const journal = await appendTradeJournalEntry({
    narrativeId,
    narrativeTitle,
    wallet: typeof wallet === "string" ? wallet : undefined,
    network: typeof network === "string" ? network : undefined,
    submittedLegs,
    successLegs,
    message,
    fills: fills.filter(isRecord).map((fill) => ({
      symbol: typeof fill.symbol === "string" ? fill.symbol : undefined,
      status: typeof fill.status === "string" ? fill.status : undefined,
      side: typeof fill.side === "string" ? fill.side : undefined,
      price: typeof fill.price === "number" ? fill.price : undefined,
      quantity: typeof fill.quantity === "number" ? fill.quantity : undefined,
      filledQuantity:
        typeof fill.filledQuantity === "number" ? fill.filledQuantity : undefined,
      clOrdId: typeof fill.clOrdId === "string" ? fill.clOrdId : undefined,
    })),
  });

  return Response.json(journal);
}

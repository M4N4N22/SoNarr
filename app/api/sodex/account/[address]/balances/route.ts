import { NextResponse } from "next/server";

import { getAccountBalances } from "@/lib/sodex";
import { resolveSodexNetwork } from "@/lib/sodex/network-preference";

type RouteProps = {
  params: Promise<{ address: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { address } = await params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  const network = resolveSodexNetwork(new URL(request.url).searchParams.get("network"));
  const result = await getAccountBalances(address, network);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.status.message, status: result.status, network },
      { status: 502 },
    );
  }

  return NextResponse.json({
    balances: result.data,
    network,
    status: result.status,
  });
}

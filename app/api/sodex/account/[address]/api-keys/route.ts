import { NextResponse } from "next/server";

import { getAccountApiKeys } from "@/lib/sodex";

type RouteProps = {
  params: Promise<{ address: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { address } = await params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  const result = await getAccountApiKeys(address);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.status.message, status: result.status },
      { status: 502 },
    );
  }

  return NextResponse.json({
    apiKeys: result.data,
    status: result.status,
  });
}

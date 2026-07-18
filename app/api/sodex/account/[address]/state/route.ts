import { NextResponse } from "next/server";

import { getAccountState, sodexOnboardingUrl } from "@/lib/sodex";
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
  const result = await getAccountState(address, network);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.status.message, status: result.status, network },
      { status: 502 },
    );
  }

  if (result.data === null) {
    return NextResponse.json({
      state: null,
      onboarded: false,
      network,
      onboardingUrl: sodexOnboardingUrl(network),
      status: result.status,
      message:
        network === "mainnet"
          ? "This wallet has no SoDEX mainnet account yet. Connect once on sodex.com, then refresh."
          : "This wallet has no SoDEX testnet account yet. Connect on testnet.sodex.com, claim faucet funds, transfer to Spot, then refresh.",
    });
  }

  return NextResponse.json({
    state: result.data,
    onboarded: true,
    network,
    status: result.status,
  });
}

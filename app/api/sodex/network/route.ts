import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getDefaultSodexNetwork,
  isSodexNetworkLocked,
  parseSodexNetwork,
  resolveSodexNetwork,
  sodexNetworkCookieOptions,
  SODEx_NETWORK_COOKIE,
  type SodexNetwork,
} from "@/lib/sodex/network-preference";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const fromCookie = parseSodexNetwork(jar.get(SODEx_NETWORK_COOKIE)?.value);
  const network = resolveSodexNetwork(fromCookie);

  return NextResponse.json({
    network,
    defaultNetwork: getDefaultSodexNetwork(),
    locked: isSodexNetworkLocked(),
    cookieNetwork: fromCookie ?? null,
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const requested =
    typeof body === "object" && body !== null && "network" in body
      ? parseSodexNetwork(String((body as { network?: unknown }).network))
      : undefined;

  if (!requested) {
    return NextResponse.json({ error: "network must be testnet or mainnet." }, { status: 400 });
  }

  if (isSodexNetworkLocked()) {
    const locked = resolveSodexNetwork(null);
    return NextResponse.json(
      {
        error: `Network is locked to ${locked} for this deployment (SODEX_NETWORK_LOCK).`,
        network: locked,
        locked: true,
      },
      { status: 403 },
    );
  }

  const network: SodexNetwork = requested;
  const response = NextResponse.json({
    network,
    defaultNetwork: getDefaultSodexNetwork(),
    locked: false,
  });

  const cookie = sodexNetworkCookieOptions(network);
  response.cookies.set(cookie.name, cookie.value, {
    path: cookie.path,
    sameSite: cookie.sameSite,
    maxAge: cookie.maxAge,
    httpOnly: cookie.httpOnly,
  });

  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

async function browserProxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const owners: string[] = (process.env.OWNER_IDS || "").match(/\d{17,20}/g) || [];
  if (!token?.sub || !owners.includes(token.sub)) {
    return NextResponse.json({ detail: "Only the bot owner can manage its YouTube login." }, { status: 403 });
  }
  const publicOrigin = new URL(process.env.NEXTAUTH_URL || req.url).origin;
  if (req.method === "POST" && req.headers.get("origin") !== publicOrigin) {
    return NextResponse.json({ detail: "Open this page on your MidVox website." }, { status: 403 });
  }
  try {
    const body = req.method === "POST" ? await req.text() : undefined;
    if (body && body.length > 8192) {
      return NextResponse.json({ detail: "Browser action is too large." }, { status: 400 });
    }
    const loginBase = `http://127.0.0.1:${process.env.YT_LOGIN_PORT || "8082"}`;
    const response = await fetch(`${loginBase}/browser`, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const failure = error as { cause?: { code?: string }; name?: string };
    const cause = failure?.cause?.code;
    const timedOut = failure?.name === "TimeoutError";
    return NextResponse.json({
      detail: timedOut
        ? "The Railway login sidecar did not answer within 60 seconds. Close this page and open the login page again; if it persists, check the [login] lines in the deployment log."
        : `The Railway login sidecar is not running (${cause || "connection refused"}). Check the [login] lines in the deployment log; login.py writes its startup error there.`,
      reason: timedOut ? "timeout" : (cause || "unreachable"),
    }, { status: 502 });
  }
}

export const GET = browserProxy;
export const POST = browserProxy;

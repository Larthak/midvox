import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let loginSidecar = "unreachable";
  try {
    const login = await fetch(`http://127.0.0.1:${process.env.YT_LOGIN_PORT || "8082"}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (login.ok) loginSidecar = "ready";
  } catch {}
  try {
    const response = await fetch("http://127.0.0.1:5001/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    return NextResponse.json({ ...body, login_sidecar: loginSidecar }, { status: response.status });
  } catch {
    return NextResponse.json(
      { status: "unavailable", detail: "Bot API is not responding", login_sidecar: loginSidecar },
      { status: 503 },
    );
  }
}

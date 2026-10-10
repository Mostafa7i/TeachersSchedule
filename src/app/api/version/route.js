import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// رقم الإصدار — يُحدَّث تلقائياً عند كل push
// DO NOT EDIT MANUALLY — updated by scripts/push.js
export const APP_VERSION = "1791629474080";

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
      },
    },
  );
}

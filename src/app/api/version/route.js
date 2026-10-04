import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// رقم الإصدار — يُحدَّث تلقائياً عند كل push
// DO NOT EDIT MANUALLY — updated by scripts/push.js
export const APP_VERSION = "1791119690326";

export async function GET() {
  return NextResponse.json(
    { version: APP_VERSION, timestamp: Date.now() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}

import { NextResponse } from "next/server";

// رقم الإصدار — يُحدَّث تلقائياً عند كل push
// DO NOT EDIT MANUALLY — updated by scripts/push.js
export const APP_VERSION = "1791119207526";

export async function GET() {
  return NextResponse.json(
    { version: APP_VERSION },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    },
  );
}

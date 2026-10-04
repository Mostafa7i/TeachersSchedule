import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const buildTime =
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    process.env.BUILD_ID ||
    "dev-build";

  return NextResponse.json(
    {
      buildTime,
      status: "ok",
      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

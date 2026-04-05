import { NextResponse } from "next/server";

import { lookupBarcode } from "@/lib/barcodes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") || "";

  try {
    const result = await lookupBarcode(code);
    return NextResponse.json({
      found: Boolean(result),
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        found: false,
        error: error instanceof Error ? error.message : "Lookup failed.",
      },
      { status: 502 },
    );
  }
}

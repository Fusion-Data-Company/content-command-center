import { NextResponse } from "next/server";
import { getStudioGenerations } from "@/lib/db/queries/studio-generations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const brandProfileId = searchParams.get("brandProfileId") ?? undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const generations = await getStudioGenerations(brandProfileId, limit);
    return NextResponse.json(generations);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch history", details: String(err) },
      { status: 500 }
    );
  }
}

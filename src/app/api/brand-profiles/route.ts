import { NextResponse } from "next/server";
import {
  getBrandProfiles,
  createBrandProfile,
} from "@/lib/db/queries/brand-profiles";

export async function GET() {
  try {
    const profiles = await getBrandProfiles();
    return NextResponse.json(profiles);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch brand profiles", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.companyName) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 }
      );
    }
    const profile = await createBrandProfile(body);
    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create brand profile", details: String(err) },
      { status: 500 }
    );
  }
}

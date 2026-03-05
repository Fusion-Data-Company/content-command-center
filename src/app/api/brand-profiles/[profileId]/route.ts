import { NextResponse } from "next/server";
import {
  getBrandProfileById,
  updateBrandProfile,
  deleteBrandProfile,
} from "@/lib/db/queries/brand-profiles";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const profile = await getBrandProfileById(profileId);
    if (!profile) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch brand profile", details: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const body = await req.json();
    const profile = await updateBrandProfile(profileId, body);
    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update brand profile", details: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    await deleteBrandProfile(profileId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete brand profile", details: String(err) },
      { status: 500 }
    );
  }
}

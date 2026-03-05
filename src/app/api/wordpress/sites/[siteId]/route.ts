import { NextRequest } from "next/server";
import {
  getSiteById,
  updateSite,
  deleteSite,
} from "@/lib/db/queries/wordpress";
import { encryptPassword } from "@/lib/wordpress/crypto";

// GET /api/wordpress/sites/[siteId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const site = await getSiteById(siteId);
    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }
    const { wpAppPasswordEncrypted, ...safeSite } = site;
    return Response.json(safeSite);
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch site", details: String(err) },
      { status: 500 }
    );
  }
}

// PUT /api/wordpress/sites/[siteId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = {};

    // Only include fields that were provided
    const allowedFields = [
      "siteName",
      "siteUrl",
      "description",
      "clientName",
      "clientLogo",
      "clientIndustry",
      "clientNotes",
      "brandProfileId",
      "wpUsername",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle password update separately (needs encryption)
    if (body.wpAppPassword) {
      updateData.wpAppPasswordEncrypted = encryptPassword(body.wpAppPassword);
    }

    if (body.siteUrl) {
      updateData.siteUrl = body.siteUrl.replace(/\/+$/, "");
    }

    const site = await updateSite(siteId, updateData);
    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const { wpAppPasswordEncrypted, ...safeSite } = site;
    return Response.json(safeSite);
  } catch (err) {
    return Response.json(
      { error: "Failed to update site", details: String(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/wordpress/sites/[siteId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    await deleteSite(siteId);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: "Failed to delete site", details: String(err) },
      { status: 500 }
    );
  }
}

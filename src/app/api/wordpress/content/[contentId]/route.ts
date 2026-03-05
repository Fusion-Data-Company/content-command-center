import { NextRequest } from "next/server";
import {
  getExternalContentById,
  deleteExternalContent,
} from "@/lib/db/queries/wordpress";

// GET /api/wordpress/content/[contentId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const content = await getExternalContentById(contentId);
    if (!content) {
      return Response.json({ error: "Content not found" }, { status: 404 });
    }
    return Response.json(content);
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch content", details: String(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/wordpress/content/[contentId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    await deleteExternalContent(contentId);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: "Failed to delete content", details: String(err) },
      { status: 500 }
    );
  }
}

import { getAllContent, getAllImages } from "@/lib/db/queries/content";

// GET /api/gallery — Get all content and images across all projects
export async function GET() {
  try {
    const [content, images] = await Promise.all([
      getAllContent(),
      getAllImages(),
    ]);

    return Response.json({ content, images });
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch gallery data", details: String(err) },
      { status: 500 }
    );
  }
}

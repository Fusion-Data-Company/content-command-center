import { NextRequest } from "next/server";
import {
  getExternalContent,
  createExternalContent,
} from "@/lib/db/queries/wordpress";

// GET /api/wordpress/content — List external content
export async function GET() {
  try {
    const content = await getExternalContent();
    return Response.json(content);
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch content", details: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/wordpress/content — Create external content
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, contentHtml, contentMarkdown, metaTitle, metaDescription, uploadedFileUrl, uploadedFileName, fileType } = body;

    if (!title) {
      return Response.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const content = await createExternalContent({
      title,
      contentHtml,
      contentMarkdown,
      metaTitle,
      metaDescription,
      uploadedFileUrl,
      uploadedFileName,
      fileType,
    });

    return Response.json(content);
  } catch (err) {
    return Response.json(
      { error: "Failed to create content", details: String(err) },
      { status: 500 }
    );
  }
}

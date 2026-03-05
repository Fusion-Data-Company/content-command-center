import { NextRequest } from "next/server";
import {
  getContentByProject,
  getLatestContentByProject,
  createContent,
} from "@/lib/db/queries/content";

// GET /api/projects/[projectId]/content — Get all generated content for project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const content = await getContentByProject(projectId);
    return Response.json(content);
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch content", details: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/content — Save generated content
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await req.json();

    const { contentHtml, contentMarkdown, metaTitle, metaDescription, urlSlug } = body;

    if (!contentHtml) {
      return Response.json(
        { error: "contentHtml is required" },
        { status: 400 }
      );
    }

    // Determine next version number
    const latest = await getLatestContentByProject(projectId);
    const nextVersion = latest ? latest.version + 1 : 1;

    const content = await createContent({
      projectId,
      contentHtml,
      contentMarkdown,
      metaTitle,
      metaDescription,
      urlSlug,
      version: nextVersion,
    });

    return Response.json(content);
  } catch (err) {
    return Response.json(
      { error: "Failed to save content", details: String(err) },
      { status: 500 }
    );
  }
}

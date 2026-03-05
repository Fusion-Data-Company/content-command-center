import { NextRequest } from "next/server";
import { getImagesByProject, createImage, createImages } from "@/lib/db/queries/content";

// GET /api/projects/[projectId]/images — Get all generated images for project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const images = await getImagesByProject(projectId);
    return Response.json(images);
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch images", details: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/images — Save generated images (single or batch)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await req.json();

    // Support both single image and batch
    if (Array.isArray(body.images)) {
      const images = await createImages(
        body.images.map((img: any) => ({
          projectId,
          imageType: img.type || img.imageType,
          imageUrl: img.url || img.imageUrl,
          generationPrompt: img.prompt || img.generationPrompt,
          dimensions: img.dimensions || (img.width && img.height ? `${img.width}x${img.height}` : undefined),
        }))
      );
      return Response.json(images);
    }

    // Single image
    const image = await createImage({
      projectId,
      imageType: body.type || body.imageType,
      imageUrl: body.url || body.imageUrl,
      generationPrompt: body.prompt || body.generationPrompt,
      dimensions: body.dimensions || (body.width && body.height ? `${body.width}x${body.height}` : undefined),
    });

    return Response.json(image);
  } catch (err) {
    return Response.json(
      { error: "Failed to save images", details: String(err) },
      { status: 500 }
    );
  }
}

import { getAllContent, getAllImages } from "@/lib/db/queries/content";
import { getStudioGenerations } from "@/lib/db/queries/studio-generations";

// GET /api/gallery — Get all content and images across all projects
export async function GET() {
  try {
    const [content, projectImages, studioGens] = await Promise.all([
      getAllContent(),
      getAllImages(),
      getStudioGenerations(undefined, 100),
    ]);

    // Merge studio generations into the images array
    const studioImages = studioGens.flatMap((gen) => {
      const urls = (gen.resultImageUrls as string[]) || [];
      return urls.map((url) => ({
        id: `studio-${gen.id}-${urls.indexOf(url)}`,
        projectId: null,
        projectTitle: null,
        imageType: gen.stylePreset || "studio",
        imageUrl: url,
        altText: null,
        generationPrompt: gen.prompt,
        dimensions: null,
        createdAt: gen.createdAt,
      }));
    });

    const images = [...projectImages, ...studioImages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return Response.json({ content, images });
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch gallery data", details: String(err) },
      { status: 500 }
    );
  }
}

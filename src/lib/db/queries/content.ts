import { db } from "../index";
import { generatedContent, generatedImages, contentProjects } from "../schema";
import { eq, desc } from "drizzle-orm";

// ──── Generated Content ───────────────────────────────────

export async function getContentByProject(projectId: string) {
  return db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.projectId, projectId))
    .orderBy(desc(generatedContent.createdAt));
}

export async function getLatestContentByProject(projectId: string) {
  const [content] = await db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.projectId, projectId))
    .orderBy(desc(generatedContent.version))
    .limit(1);
  return content ?? null;
}

export async function createContent(data: {
  projectId: string;
  contentHtml: string;
  contentMarkdown?: string;
  metaTitle?: string;
  metaDescription?: string;
  urlSlug?: string;
  version?: number;
}) {
  const [content] = await db
    .insert(generatedContent)
    .values({
      projectId: data.projectId,
      contentHtml: data.contentHtml,
      contentMarkdown: data.contentMarkdown,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      urlSlug: data.urlSlug,
      version: data.version || 1,
    })
    .returning();
  return content;
}

// ──── Generated Images ────────────────────────────────────

export async function getImagesByProject(projectId: string) {
  return db
    .select()
    .from(generatedImages)
    .where(eq(generatedImages.projectId, projectId))
    .orderBy(desc(generatedImages.createdAt));
}

export async function createImage(data: {
  projectId: string;
  contentId?: string;
  imageType?: string;
  imageUrl: string;
  altText?: string;
  caption?: string;
  generationPrompt?: string;
  dimensions?: string;
  sectionPlacement?: string;
}) {
  const [image] = await db
    .insert(generatedImages)
    .values(data)
    .returning();
  return image;
}

export async function createImages(
  images: {
    projectId: string;
    contentId?: string;
    imageType?: string;
    imageUrl: string;
    altText?: string;
    generationPrompt?: string;
    dimensions?: string;
  }[]
) {
  if (images.length === 0) return [];
  return db.insert(generatedImages).values(images).returning();
}

// ──── Cross-Project Queries ─────────────────────────────────

export async function getAllContent() {
  return db
    .select({
      id: generatedContent.id,
      projectId: generatedContent.projectId,
      projectTitle: contentProjects.title,
      version: generatedContent.version,
      contentHtml: generatedContent.contentHtml,
      contentMarkdown: generatedContent.contentMarkdown,
      metaTitle: generatedContent.metaTitle,
      metaDescription: generatedContent.metaDescription,
      urlSlug: generatedContent.urlSlug,
      createdAt: generatedContent.createdAt,
    })
    .from(generatedContent)
    .leftJoin(contentProjects, eq(generatedContent.projectId, contentProjects.id))
    .orderBy(desc(generatedContent.createdAt));
}

export async function getAllImages() {
  return db
    .select({
      id: generatedImages.id,
      projectId: generatedImages.projectId,
      projectTitle: contentProjects.title,
      imageType: generatedImages.imageType,
      imageUrl: generatedImages.imageUrl,
      altText: generatedImages.altText,
      generationPrompt: generatedImages.generationPrompt,
      dimensions: generatedImages.dimensions,
      createdAt: generatedImages.createdAt,
    })
    .from(generatedImages)
    .leftJoin(contentProjects, eq(generatedImages.projectId, contentProjects.id))
    .orderBy(desc(generatedImages.createdAt));
}

"use server";

import { db } from "../index";
import {
  wordpressSites,
  publishingJobs,
  externalContent,
  generatedContent,
  contentProjects,
} from "../schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ──── WordPress Sites ─────────────────────────────────────

export async function getSites() {
  return db
    .select()
    .from(wordpressSites)
    .orderBy(wordpressSites.siteName);
}

export async function getSiteById(siteId: string) {
  const [site] = await db
    .select()
    .from(wordpressSites)
    .where(eq(wordpressSites.id, siteId))
    .limit(1);
  return site ?? null;
}

export async function createSite(
  data: typeof wordpressSites.$inferInsert
) {
  const [site] = await db
    .insert(wordpressSites)
    .values(data)
    .returning();
  revalidatePath("/wordpress");
  return site;
}

export async function updateSite(
  siteId: string,
  data: Partial<typeof wordpressSites.$inferInsert>
) {
  const [site] = await db
    .update(wordpressSites)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(wordpressSites.id, siteId))
    .returning();
  revalidatePath("/wordpress");
  return site;
}

export async function deleteSite(siteId: string) {
  await db
    .delete(wordpressSites)
    .where(eq(wordpressSites.id, siteId));
  revalidatePath("/wordpress");
}

// ──── Publishing Jobs ─────────────────────────────────────

export async function getJobs(limit = 20) {
  return db
    .select()
    .from(publishingJobs)
    .orderBy(desc(publishingJobs.createdAt))
    .limit(limit);
}

export async function getJobsBySite(siteId: string) {
  return db
    .select()
    .from(publishingJobs)
    .where(eq(publishingJobs.siteId, siteId))
    .orderBy(desc(publishingJobs.createdAt));
}

export async function getJobById(jobId: string) {
  const [job] = await db
    .select()
    .from(publishingJobs)
    .where(eq(publishingJobs.id, jobId))
    .limit(1);
  return job ?? null;
}

export async function createJob(
  data: typeof publishingJobs.$inferInsert
) {
  const [job] = await db
    .insert(publishingJobs)
    .values(data)
    .returning();
  return job;
}

export async function updateJob(
  jobId: string,
  data: Partial<typeof publishingJobs.$inferInsert>
) {
  const [job] = await db
    .update(publishingJobs)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(publishingJobs.id, jobId))
    .returning();
  return job;
}

// ──── External Content ────────────────────────────────────

export async function getExternalContent() {
  return db
    .select()
    .from(externalContent)
    .orderBy(desc(externalContent.createdAt));
}

export async function getExternalContentById(contentId: string) {
  const [content] = await db
    .select()
    .from(externalContent)
    .where(eq(externalContent.id, contentId))
    .limit(1);
  return content ?? null;
}

export async function createExternalContent(
  data: typeof externalContent.$inferInsert
) {
  const [content] = await db
    .insert(externalContent)
    .values(data)
    .returning();
  return content;
}

export async function deleteExternalContent(contentId: string) {
  await db
    .delete(externalContent)
    .where(eq(externalContent.id, contentId));
}

// ──── Generated Content (for publishing hub) ──────────────

export async function getGeneratedContentList() {
  return db
    .select({
      id: generatedContent.id,
      projectId: generatedContent.projectId,
      version: generatedContent.version,
      metaTitle: generatedContent.metaTitle,
      metaDescription: generatedContent.metaDescription,
      urlSlug: generatedContent.urlSlug,
      createdAt: generatedContent.createdAt,
      projectTitle: contentProjects.title,
    })
    .from(generatedContent)
    .leftJoin(
      contentProjects,
      eq(generatedContent.projectId, contentProjects.id)
    )
    .orderBy(desc(generatedContent.createdAt));
}

export async function getGeneratedContentById(contentId: string) {
  const [content] = await db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.id, contentId))
    .limit(1);
  return content ?? null;
}

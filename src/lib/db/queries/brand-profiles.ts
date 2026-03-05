"use server";

import { db } from "../index";
import { brandProfiles } from "../schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getBrandProfiles() {
  return db
    .select()
    .from(brandProfiles)
    .orderBy(desc(brandProfiles.updatedAt));
}

export async function getBrandProfileById(id: string) {
  const [profile] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.id, id))
    .limit(1);
  return profile ?? null;
}

export async function getDefaultBrandProfile() {
  const [profile] = await db
    .select()
    .from(brandProfiles)
    .orderBy(desc(brandProfiles.updatedAt))
    .limit(1);
  return profile ?? null;
}

export async function createBrandProfile(data: {
  companyName: string;
  industry?: string;
  brandVoice?: string;
  colorPalette?: string[];
  logoUrl?: string;
  targetAudiences?: string[];
  competitorUrls?: string[];
  keywords?: string[];
  referenceImageUrls?: string[];
  brandGuidelines?: string;
}) {
  const [profile] = await db
    .insert(brandProfiles)
    .values(data)
    .returning();
  revalidatePath("/");
  return profile;
}

export async function updateBrandProfile(
  id: string,
  data: Partial<{
    companyName: string;
    industry: string;
    brandVoice: string;
    colorPalette: string[];
    logoUrl: string;
    targetAudiences: string[];
    competitorUrls: string[];
    keywords: string[];
    referenceImageUrls: string[];
    brandGuidelines: string;
    styleGuideUrl: string;
    sitemapUrl: string;
  }>
) {
  const [profile] = await db
    .update(brandProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(brandProfiles.id, id))
    .returning();
  revalidatePath("/");
  return profile;
}

export async function deleteBrandProfile(id: string) {
  await db.delete(brandProfiles).where(eq(brandProfiles.id, id));
  revalidatePath("/");
}

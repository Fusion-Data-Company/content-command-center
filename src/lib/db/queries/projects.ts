"use server";

import { db } from "../index";
import { contentProjects } from "../schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProjects() {
  return db
    .select()
    .from(contentProjects)
    .orderBy(desc(contentProjects.updatedAt));
}

export async function getProjectById(projectId: string) {
  const [project] = await db
    .select()
    .from(contentProjects)
    .where(eq(contentProjects.id, projectId))
    .limit(1);
  return project ?? null;
}

export async function createProject(title: string) {
  const [project] = await db
    .insert(contentProjects)
    .values({ title })
    .returning();
  revalidatePath("/");
  return project;
}

export async function updateProject(
  projectId: string,
  data: Partial<{
    title: string;
    status: string;
    topic: string;
    primaryKeyword: string;
    targetAudience: string;
    contentGoal: string;
  }>
) {
  const [project] = await db
    .update(contentProjects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contentProjects.id, projectId))
    .returning();
  revalidatePath("/");
  return project;
}

export async function deleteProject(projectId: string) {
  await db
    .delete(contentProjects)
    .where(eq(contentProjects.id, projectId));
  revalidatePath("/");
}

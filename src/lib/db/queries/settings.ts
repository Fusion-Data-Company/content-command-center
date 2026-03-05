import { db } from "../index";
import { appSettings } from "../schema";
import { eq } from "drizzle-orm";
import type { NewAppSettings } from "../schema";

const DEFAULT_USER = "default";

export async function getSettings() {
  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.userId, DEFAULT_USER))
    .limit(1);

  if (existing) return existing;

  // Create default settings row if none exists
  const [created] = await db
    .insert(appSettings)
    .values({ userId: DEFAULT_USER })
    .returning();

  return created;
}

export async function updateSettings(
  data: Partial<Omit<NewAppSettings, "id" | "userId" | "createdAt">>
) {
  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.userId, DEFAULT_USER))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(appSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appSettings.userId, DEFAULT_USER))
      .returning();
    return updated;
  }

  // Create with provided values
  const [created] = await db
    .insert(appSettings)
    .values({ userId: DEFAULT_USER, ...data })
    .returning();

  return created;
}

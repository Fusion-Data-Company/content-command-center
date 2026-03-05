import { db } from "../index";
import { chatMessages } from "../schema";
import { eq, asc } from "drizzle-orm";

export async function getMessagesByProject(projectId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.projectId, projectId))
    .orderBy(asc(chatMessages.createdAt));
}

export async function createMessage(data: {
  projectId: string;
  role: string;
  content: string;
  attachments?: unknown;
}) {
  const [message] = await db
    .insert(chatMessages)
    .values(data)
    .returning();
  return message;
}

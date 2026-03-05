import { db } from "@/lib/db";
import { chatMessages, contentProjects } from "@/lib/db/schema";

// DELETE /api/settings/data — Data management actions
export async function DELETE(req: Request) {
  try {
    const { action } = await req.json();

    if (action === "clear-history") {
      await db.delete(chatMessages);
      return Response.json({ success: true, action: "clear-history" });
    }

    if (action === "delete-projects") {
      // Cascades to chat_messages, generated_content, generated_images
      await db.delete(contentProjects);
      return Response.json({ success: true, action: "delete-projects" });
    }

    return Response.json(
      { error: "Invalid action. Use 'clear-history' or 'delete-projects'" },
      { status: 400 }
    );
  } catch (err) {
    return Response.json(
      { error: "Data operation failed", details: String(err) },
      { status: 500 }
    );
  }
}

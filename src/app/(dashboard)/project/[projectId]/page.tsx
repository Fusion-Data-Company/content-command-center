import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/db/queries/projects";
import { getMessagesByProject } from "@/lib/db/queries/messages";
import { getLatestContentByProject, getImagesByProject } from "@/lib/db/queries/content";
import { ChatContainer } from "@/components/chat/chat-container";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProjectById(projectId);
  if (!project) notFound();

  const [messages, savedContent, savedImages] = await Promise.all([
    getMessagesByProject(projectId),
    getLatestContentByProject(projectId),
    getImagesByProject(projectId),
  ]);

  return (
    <ChatContainer
      projectId={project.id}
      initialMessages={messages}
      projectTitle={project.title}
      initialContent={savedContent}
      initialImages={savedImages}
    />
  );
}

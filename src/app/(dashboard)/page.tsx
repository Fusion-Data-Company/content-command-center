import { getProjects } from "@/lib/db/queries/projects";
import Link from "next/link";
import Image from "next/image";
import { FileText, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const projects = await getProjects();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-4 mb-2">
          <Image
            src="/logo.png"
            alt="Marketing Strategy"
            width={48}
            height={48}
            className="rounded-lg"
          />
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Content Command Center
            </h1>
            <p className="text-text-dim text-sm mt-0.5">
              AI-powered content generation and multi-platform publishing
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-5">
              <Image
                src="/logo.png"
                alt="Marketing Strategy"
                width={48}
                height={48}
                className="rounded-lg"
              />
            </div>
            <h2 className="font-heading text-xl font-semibold text-text-primary mb-2">
              No projects yet
            </h2>
            <p className="text-text-dim text-sm mb-6 max-w-sm">
              Create your first project to start generating strategic content
              with AI intelligence.
            </p>
            <NewProjectButton />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold text-text-primary">
                Projects
              </h2>
              <NewProjectButton />
            </div>
            <div className="grid gap-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl bg-surface border border-border hover:border-accent/30 hover:bg-accent/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText
                      size={18}
                      className="text-accent"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                      {project.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatDate(project.updatedAt)} &middot;{" "}
                      <span className="capitalize">{project.status}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewProjectButton() {
  return (
    <Link
      href="/?new=true"
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent-hover transition-colors"
    >
      <Plus size={16} />
      New Project
    </Link>
  );
}

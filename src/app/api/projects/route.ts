import { NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/db/queries/projects";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { title } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const project = await createProject(title);
  return NextResponse.json(project);
}

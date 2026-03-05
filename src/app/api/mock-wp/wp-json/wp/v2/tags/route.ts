import { NextRequest } from "next/server";
import { getTags, createTag, validateMockAuth } from "@/lib/wordpress/mock-store";

export async function GET(req: NextRequest) {
  if (!validateMockAuth(req)) {
    return Response.json(
      { code: "rest_cannot_access", message: "Authentication required." },
      { status: 401 }
    );
  }

  const search = req.nextUrl.searchParams.get("search") || undefined;
  return Response.json(getTags(search));
}

export async function POST(req: NextRequest) {
  if (!validateMockAuth(req)) {
    return Response.json(
      { code: "rest_cannot_access", message: "Authentication required." },
      { status: 401 }
    );
  }

  const body = await req.json();
  if (!body.name) {
    return Response.json(
      { code: "rest_invalid_param", message: "Tag name is required." },
      { status: 400 }
    );
  }

  const tag = createTag(body.name);
  return Response.json(tag, { status: 201 });
}

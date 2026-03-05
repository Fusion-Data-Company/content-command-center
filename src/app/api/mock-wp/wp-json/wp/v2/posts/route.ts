import { NextRequest } from "next/server";
import {
  getPosts,
  createPost,
  validateMockAuth,
  getBaseUrl,
} from "@/lib/wordpress/mock-store";

export async function GET(req: NextRequest) {
  if (!validateMockAuth(req)) {
    return Response.json(
      { code: "rest_cannot_access", message: "Authentication required." },
      { status: 401 }
    );
  }

  const perPage = parseInt(req.nextUrl.searchParams.get("per_page") || "20", 10);
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);

  return Response.json(getPosts(perPage, page));
}

export async function POST(req: NextRequest) {
  if (!validateMockAuth(req)) {
    return Response.json(
      { code: "rest_cannot_access", message: "Authentication required." },
      { status: 401 }
    );
  }

  const body = await req.json();
  if (!body.title) {
    return Response.json(
      { code: "rest_invalid_param", message: "Post title is required." },
      { status: 400 }
    );
  }

  const baseUrl = getBaseUrl(req);
  const post = createPost(
    {
      title: body.title,
      content: body.content || "",
      status: body.status || "draft",
      categories: body.categories,
      tags: body.tags,
      excerpt: body.excerpt,
      slug: body.slug,
      featured_media: body.featured_media,
    },
    baseUrl
  );

  return Response.json(post, { status: 201 });
}

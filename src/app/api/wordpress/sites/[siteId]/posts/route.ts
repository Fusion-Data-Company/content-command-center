import { NextRequest } from "next/server";
import { getSiteById } from "@/lib/db/queries/wordpress";
import { decryptPassword } from "@/lib/wordpress/crypto";
import { fetchPosts } from "@/lib/wordpress/api";

// GET /api/wordpress/sites/[siteId]/posts — Proxy WordPress posts list
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const site = await getSiteById(siteId);
    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const password = decryptPassword(site.wpAppPasswordEncrypted);
    const searchParams = req.nextUrl.searchParams;

    const posts = await fetchPosts(
      {
        siteUrl: site.siteUrl,
        username: site.wpUsername,
        password,
      },
      {
        per_page: Number(searchParams.get("per_page")) || 20,
        page: Number(searchParams.get("page")) || 1,
      }
    );

    return Response.json(posts);
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch posts", details: String(err) },
      { status: 500 }
    );
  }
}

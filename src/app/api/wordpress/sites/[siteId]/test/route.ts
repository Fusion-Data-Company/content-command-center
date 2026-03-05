import { NextRequest } from "next/server";
import { getSiteById, updateSite } from "@/lib/db/queries/wordpress";
import { decryptPassword } from "@/lib/wordpress/crypto";
import { testConnection } from "@/lib/wordpress/api";

// POST /api/wordpress/sites/[siteId]/test — Test connection and refresh cache
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const site = await getSiteById(siteId);
    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const password = decryptPassword(site.wpAppPasswordEncrypted);
    const result = await testConnection(site.siteUrl, site.wpUsername, password);

    await updateSite(siteId, {
      connectionStatus: result.success ? "success" : "failed",
      lastConnectionTest: new Date(),
      ...(result.success && {
        categoriesCache: result.categories,
        tagsCache: result.tags,
        wpVersion: result.version,
        lastCacheRefresh: new Date(),
      }),
    });

    return Response.json({
      success: result.success,
      error: result.error,
      categoryCount: result.categories?.length || 0,
      tagCount: result.tags?.length || 0,
      version: result.version,
    });
  } catch (err) {
    return Response.json(
      { error: "Connection test failed", details: String(err) },
      { status: 500 }
    );
  }
}

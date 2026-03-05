import { NextRequest } from "next/server";
import { encryptPassword } from "@/lib/wordpress/crypto";
import { getCategories, getTags, getBaseUrl } from "@/lib/wordpress/mock-store";
import { db } from "@/lib/db";
import { wordpressSites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const baseUrl = getBaseUrl(req);
    const siteUrl = `${baseUrl}/api/mock-wp`;

    // Check if a demo site already exists for this URL
    const existing = await db
      .select()
      .from(wordpressSites)
      .where(eq(wordpressSites.siteUrl, siteUrl))
      .limit(1);

    if (existing.length > 0) {
      const site = existing[0];
      const { wpAppPasswordEncrypted: _, ...safeSite } = site;
      return Response.json(safeSite);
    }

    // Create the demo site
    const [site] = await db
      .insert(wordpressSites)
      .values({
        siteName: "Demo WordPress Site",
        siteUrl,
        wpUsername: "demo",
        wpAppPasswordEncrypted: encryptPassword("demo_app_password"),
        description:
          "A mock WordPress site for testing the full publishing flow. No real WordPress instance required.",
        clientName: "Demo Client",
        clientIndustry: "Technology",
        clientNotes:
          "This is a demo site powered by the Content Command Center mock WordPress API.",
        connectionStatus: "success",
        lastConnectionTest: new Date(),
        categoriesCache: getCategories(),
        tagsCache: getTags(),
        wpVersion: "6.7.1",
        lastCacheRefresh: new Date(),
      })
      .returning();

    const { wpAppPasswordEncrypted: _, ...safeSite } = site;
    return Response.json(safeSite, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: `Failed to create demo site: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

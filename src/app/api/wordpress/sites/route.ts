import { NextRequest } from "next/server";
import { getSites, createSite } from "@/lib/db/queries/wordpress";
import { encryptPassword } from "@/lib/wordpress/crypto";
import { testConnection } from "@/lib/wordpress/api";

// GET /api/wordpress/sites — List all sites
export async function GET() {
  try {
    const sites = await getSites();
    // Strip encrypted passwords from response
    const safeSites = sites.map(({ wpAppPasswordEncrypted, ...site }) => site);
    return Response.json(safeSites);
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch sites", details: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/wordpress/sites — Create a new site
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      siteName,
      siteUrl,
      wpUsername,
      wpAppPassword,
      description,
      clientName,
      clientLogo,
      clientIndustry,
      clientNotes,
      brandProfileId,
    } = body;

    if (!siteName || !siteUrl || !wpUsername || !wpAppPassword) {
      return Response.json(
        { error: "siteName, siteUrl, wpUsername, and wpAppPassword are required" },
        { status: 400 }
      );
    }

    // Test connection before saving
    const connectionResult = await testConnection(siteUrl, wpUsername, wpAppPassword);

    // Encrypt the password
    const encrypted = encryptPassword(wpAppPassword);

    const site = await createSite({
      siteName,
      siteUrl: siteUrl.replace(/\/+$/, ""),
      wpUsername,
      wpAppPasswordEncrypted: encrypted,
      description,
      clientName,
      clientLogo,
      clientIndustry,
      clientNotes,
      brandProfileId: brandProfileId || null,
      connectionStatus: connectionResult.success ? "success" : "failed",
      lastConnectionTest: new Date(),
      categoriesCache: connectionResult.categories || [],
      tagsCache: connectionResult.tags || [],
      wpVersion: connectionResult.version,
    });

    // Strip encrypted password from response
    const { wpAppPasswordEncrypted, ...safeSite } = site;

    return Response.json({
      ...safeSite,
      connectionResult: {
        success: connectionResult.success,
        error: connectionResult.error,
        categoryCount: connectionResult.categories?.length || 0,
        tagCount: connectionResult.tags?.length || 0,
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to create site", details: String(err) },
      { status: 500 }
    );
  }
}

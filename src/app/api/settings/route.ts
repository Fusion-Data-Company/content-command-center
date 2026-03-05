import { getSettings, updateSettings } from "@/lib/db/queries/settings";

// GET /api/settings — Get current settings + API status
export async function GET() {
  try {
    const settings = await getSettings();

    const apiStatus = {
      openrouter: !!process.env.OPENROUTER_API_KEY,
      fal: !!process.env.FAL_KEY,
      blobStorage: !!process.env.BLOB_READ_WRITE_TOKEN,
      database: !!process.env.DATABASE_URL,
    };

    return Response.json({ settings, apiStatus });
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch settings", details: String(err) },
      { status: 500 }
    );
  }
}

// PUT /api/settings — Update settings
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // Validate fields
    const allowedFields = [
      "chatModel",
      "chatTemperature",
      "chatMaxTokens",
      "defaultImageModel",
      "defaultAspectRatio",
      "defaultResolution",
      "autoGenerateImages",
      "autoGenerateInfographic",
      "defaultContentTone",
      "targetWordCount",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Basic validation
    if (updates.chatTemperature !== undefined) {
      const temp = Number(updates.chatTemperature);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        return Response.json(
          { error: "Temperature must be between 0 and 2" },
          { status: 400 }
        );
      }
    }

    if (updates.chatMaxTokens !== undefined) {
      const tokens = Number(updates.chatMaxTokens);
      if (isNaN(tokens) || tokens < 1000 || tokens > 128000) {
        return Response.json(
          { error: "Max tokens must be between 1000 and 128000" },
          { status: 400 }
        );
      }
    }

    if (updates.targetWordCount !== undefined) {
      const wc = Number(updates.targetWordCount);
      if (isNaN(wc) || wc < 100 || wc > 10000) {
        return Response.json(
          { error: "Word count must be between 100 and 10000" },
          { status: 400 }
        );
      }
    }

    const settings = await updateSettings(updates);
    return Response.json({ settings });
  } catch (err) {
    return Response.json(
      { error: "Failed to update settings", details: String(err) },
      { status: 500 }
    );
  }
}

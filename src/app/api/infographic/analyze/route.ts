import { NextResponse } from "next/server";
import { buildInfographicAnalysisPrompt } from "@/lib/openrouter/infographic-prompt";
import { getBrandProfileById } from "@/lib/db/queries/brand-profiles";
import { getSettings } from "@/lib/db/queries/settings";
import { generateImage } from "@/lib/images/fal-client";

export async function POST(req: Request) {
  try {
    const { blogContent, brandProfileId } = await req.json();

    if (!blogContent) {
      return NextResponse.json(
        { error: "blogContent is required" },
        { status: 400 }
      );
    }

    // Load user settings — bail early if auto-infographic is disabled
    const settings = await getSettings();
    if (!settings.autoGenerateInfographic) {
      return NextResponse.json({ skipped: true, reason: "Auto-generate infographic disabled in settings" });
    }

    // Fetch brand profile for colors if provided
    let brandColors: string[] | undefined;
    let industry: string | undefined;
    if (brandProfileId) {
      const profile = await getBrandProfileById(brandProfileId);
      if (profile) {
        brandColors = profile.colorPalette as string[] | undefined;
        industry = profile.industry ?? undefined;
      }
    }

    // Phase 1: Ask AI to analyze the blog and design infographic
    const analysisPrompt = buildInfographicAnalysisPrompt({
      blogContent,
      brandColors,
      industry,
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const aiRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://contentcommandcenter.com",
          "X-Title": "Content Command Center",
        },
        body: JSON.stringify({
          model: settings.chatModel,
          messages: [{ role: "user", content: analysisPrompt }],
          stream: false,
          max_tokens: 2000,
          temperature: 0.4,
        }),
      }
    );

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json(
        { error: "AI analysis failed", details: errText },
        { status: 500 }
      );
    }

    const aiData = await aiRes.json();
    const rawContent =
      aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let analysis;
    try {
      // Strip potential markdown fences
      const cleaned = rawContent
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse AI analysis",
          raw: rawContent,
        },
        { status: 500 }
      );
    }

    // Phase 2: Generate the infographic image using the AI's prompt
    const colorEnhancement = brandColors?.length
      ? ` Use this color palette: ${brandColors.join(", ")}.`
      : "";

    const fullPrompt = `${analysis.prompt}${colorEnhancement}`;

    const images = await generateImage({
      prompt: fullPrompt,
      model: "fal-ai/nano-banana-pro",
      aspectRatio: analysis.aspectRatio || "3:4",
      resolution: "1K",
      numImages: 1,
    });

    return NextResponse.json({
      analysis,
      images,
    });
  } catch (err) {
    console.error("Infographic analysis error:", err);
    return NextResponse.json(
      { error: "Infographic generation failed", details: String(err) },
      { status: 500 }
    );
  }
}

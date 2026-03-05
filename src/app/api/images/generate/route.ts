import { NextResponse } from "next/server";
import { generateImage } from "@/lib/images/fal-client";
import { getSettings } from "@/lib/db/queries/settings";
import type { ImageModel, AspectRatio, Resolution } from "@/lib/images/fal-client";

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt, model, aspectRatio, resolution, numImages } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 });
  }

  try {
    // Use explicit model or fall back to user's default image model setting
    let effectiveModel = model as ImageModel | undefined;
    if (!effectiveModel) {
      const settings = await getSettings();
      effectiveModel = settings.defaultImageModel as ImageModel;
    }

    const images = await generateImage({
      prompt,
      model: effectiveModel || "fal-ai/nano-banana-pro",
      aspectRatio: (aspectRatio as AspectRatio) || "16:9",
      resolution: (resolution as Resolution) || "1K",
      numImages: numImages || 1,
    });

    return NextResponse.json({ images });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json(
      { error: "Image generation failed", details: String(err) },
      { status: 500 }
    );
  }
}

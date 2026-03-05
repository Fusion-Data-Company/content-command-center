import { NextResponse } from "next/server";
import { generateImage } from "@/lib/images/fal-client";
import { getBrandProfileById } from "@/lib/db/queries/brand-profiles";
import { createStudioGeneration } from "@/lib/db/queries/studio-generations";
import type { ImageModel, AspectRatio, Resolution } from "@/lib/images/fal-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      brandProfileId,
      contextText,
      stylePreset,
      model,
      aspectRatio,
      resolution,
      numImages,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Enhance prompt with brand context
    let enhancedPrompt = prompt;
    let brandColors: string[] | undefined;

    if (brandProfileId) {
      const profile = await getBrandProfileById(brandProfileId);
      if (profile) {
        brandColors = profile.colorPalette as string[] | undefined;
        const guidelines = profile.brandGuidelines;

        if (brandColors?.length) {
          enhancedPrompt += ` Use brand colors: ${brandColors.join(", ")}.`;
        }
        if (guidelines) {
          enhancedPrompt += ` Brand style: ${guidelines}`;
        }
      }
    }

    if (contextText) {
      enhancedPrompt += ` Context: ${contextText.slice(0, 500)}`;
    }

    const images = await generateImage({
      prompt: enhancedPrompt,
      model: (model as ImageModel) || "fal-ai/nano-banana-pro",
      aspectRatio: (aspectRatio as AspectRatio) || "16:9",
      resolution: (resolution as Resolution) || "1K",
      numImages: numImages || 1,
    });

    // Save to history
    const generation = await createStudioGeneration({
      brandProfileId: brandProfileId || undefined,
      prompt,
      contextText,
      model: model || "fal-ai/nano-banana-pro",
      aspectRatio: aspectRatio || "16:9",
      resolution: resolution || "1K",
      stylePreset,
      resultImageUrls: images.map((img) => img.url),
    });

    return NextResponse.json({ images, generation });
  } catch (err) {
    console.error("Studio generation error:", err);
    return NextResponse.json(
      { error: "Image generation failed", details: String(err) },
      { status: 500 }
    );
  }
}

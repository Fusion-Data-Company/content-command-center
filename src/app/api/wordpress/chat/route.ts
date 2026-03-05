import { getSettings } from "@/lib/db/queries/settings";
import { getSiteById } from "@/lib/db/queries/wordpress";

interface ChatRequest {
  siteId: string;
  message: string;
  history: { role: string; content: string }[];
  contentContext: {
    title: string;
    htmlPreview: string;
    imageUrls: string[];
  };
}

function buildSystemPrompt(
  siteName: string,
  categories: { id: number; name: string }[],
  tags: { id: number; name: string }[],
  contentTitle: string,
  contentPreview: string,
  imageUrls: string[]
): string {
  return `You are a WordPress publishing assistant for the Content Command Center. You help users prepare their blog posts for publishing to WordPress.

SITE: "${siteName}"

AVAILABLE CATEGORIES:
${categories.map((c) => `- ${c.name} (ID: ${c.id})`).join("\n")}

AVAILABLE TAGS:
${tags.length > 0 ? tags.map((t) => `- ${t.name}`).join("\n") : "No pre-existing tags. New tags will be created during publishing."}

CONTENT BEING PUBLISHED:
Title: "${contentTitle}"
${contentPreview ? `\nContent Preview:\n${contentPreview.slice(0, 3000)}` : ""}

IMAGES AVAILABLE: ${imageUrls.length > 0 ? imageUrls.length + " images attached to this post" : "No images attached yet"}

YOUR ROLE:
- Help the user optimize their post title for SEO and engagement
- Suggest URL slugs that are clean and keyword-rich
- Recommend which categories best fit the content
- Suggest relevant tags for SEO and discoverability
- Help write compelling excerpts
- Advise on featured image selection
- Answer questions about the content or publishing process
- Keep responses concise and actionable

Do NOT generate full blog posts. Focus only on publishing optimization and configuration.`;
}

export async function POST(req: Request) {
  try {
    const body: ChatRequest = await req.json();
    const { siteId, message, history, contentContext } = body;

    if (!siteId || !message) {
      return Response.json(
        { error: "siteId and message are required" },
        { status: 400 }
      );
    }

    const site = await getSiteById(siteId);
    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const settings = await getSettings();
    const categories =
      (site.categoriesCache as { id: number; name: string; slug: string }[]) ||
      [];
    const tags =
      (site.tagsCache as { id: number; name: string; slug: string }[]) || [];

    const systemPrompt = buildSystemPrompt(
      site.siteName,
      categories,
      tags,
      contentContext.title || "",
      contentContext.htmlPreview || "",
      contentContext.imageUrls || []
    );

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const openRouterRes = await fetch(
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
          messages,
          stream: true,
          max_tokens: settings.chatMaxTokens,
          temperature: settings.chatTemperature,
        }),
      }
    );

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      console.error("OpenRouter error:", openRouterRes.status, errText);
      return Response.json(
        { error: "AI generation failed", details: errText },
        { status: 502 }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openRouterRes.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;
              if (!trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: delta })}\n\n`
                    )
                  );
                }
              } catch {
                // skip unparseable
              }
            }
          }
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("WordPress chat error:", err);
    return Response.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

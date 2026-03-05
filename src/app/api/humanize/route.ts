import { getSettings } from "@/lib/db/queries/settings";
import { getLatestContentByProject, createContent } from "@/lib/db/queries/content";
import { buildHumanizerPrompt } from "@/lib/openrouter/humanizer-prompt";

export async function POST(req: Request) {
  try {
    const { projectId, blogContent, keywords, tone } = await req.json();

    if (!projectId || !blogContent) {
      return new Response(
        JSON.stringify({ error: "projectId and blogContent are required" }),
        { status: 400 }
      );
    }

    const settings = await getSettings();
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500 }
      );
    }

    const prompt = buildHumanizerPrompt({ blogContent, keywords, tone });

    // Call OpenRouter with streaming
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
          messages: [{ role: "user", content: prompt }],
          stream: true,
          max_tokens: settings.chatMaxTokens,
          temperature: 0.8, // Slightly higher for more human-like variation
        }),
      }
    );

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      return new Response(
        JSON.stringify({ error: "Humanization failed", details: errText }),
        { status: 502 }
      );
    }

    let fullContent = "";
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
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
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
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
            )
          );
        } finally {
          // Save humanized content as new version
          if (fullContent && fullContent.length > 50) {
            try {
              const latest = await getLatestContentByProject(projectId);
              const nextVersion = latest ? latest.version + 1 : 1;

              await createContent({
                projectId,
                contentHtml: fullContent,
                contentMarkdown: fullContent,
                metaTitle: latest?.metaTitle ?? undefined,
                metaDescription: latest?.metaDescription ?? undefined,
                urlSlug: latest?.urlSlug ?? undefined,
                version: nextVersion,
                isNaturalized: true,
                naturalizeStrength: "full",
              });

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "saved", version: nextVersion })}\n\n`
                )
              );
            } catch (e) {
              console.error("Failed to save humanized content:", e);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "save_error", error: String(e) })}\n\n`
                )
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
    console.error("Humanizer API error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500 }
    );
  }
}

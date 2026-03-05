import { createMessage } from "@/lib/db/queries/messages";
import { getSettings } from "@/lib/db/queries/settings";
import { buildSystemPrompt } from "@/lib/openrouter/prompts";

export async function POST(req: Request) {
  try {
    const { projectId, message, history } = await req.json();

    if (!projectId || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }

    // Persist user message
    await createMessage({
      projectId,
      role: "user",
      content: message,
    });

    // Load user settings
    const settings = await getSettings();

    // Build messages for OpenRouter
    const systemPrompt = buildSystemPrompt();
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY not set");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
      });
    }

    // Call OpenRouter
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
      return new Response(JSON.stringify({ error: "AI generation failed", details: errText }), {
        status: 502,
      });
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
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

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
        // Persist assistant message
        if (fullContent) {
          try {
            await createMessage({
              projectId,
              role: "assistant",
              content: fullContent,
            });
          } catch (e) {
            console.error("Failed to persist assistant message:", e);
          }
        }
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
    console.error("Chat API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
    });
  }
}

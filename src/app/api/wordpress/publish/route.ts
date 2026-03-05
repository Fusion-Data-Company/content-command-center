import { NextRequest } from "next/server";
import { getSiteById, getGeneratedContentById, getExternalContentById, createJob, updateJob } from "@/lib/db/queries/wordpress";
import { getSettings } from "@/lib/db/queries/settings";
import { decryptPassword } from "@/lib/wordpress/crypto";
import {
  publishPost,
  uploadMedia,
  createOrFindTags,
  verifyPost,
  type WPCategory,
} from "@/lib/wordpress/api";

interface PublishRequest {
  siteId: string;
  contentId?: string; // generated content ID
  externalContentId?: string; // external content ID
  contentSource: "platform" | "external";
  postTitle: string;
  postSlug?: string;
  postStatus: "draft" | "publish";
  featuredImageUrl?: string;
  contentHtml?: string; // direct HTML for external content
}

function buildAnalysisPrompt(
  contentPreview: string,
  categories: WPCategory[],
  siteName: string
): string {
  return `You are a WordPress publishing specialist. Analyze the following blog post content and provide recommendations for publishing to "${siteName}".

CONTENT:
${contentPreview.slice(0, 3000)}

AVAILABLE CATEGORIES:
${categories.map((c) => `- ${c.name} (ID: ${c.id})`).join("\n")}

Respond ONLY with valid JSON in this exact format:
{
  "categories": [<category IDs as numbers>],
  "categoryReasoning": "<brief explanation>",
  "tags": ["<tag1>", "<tag2>", ...],
  "tagReasoning": "<brief explanation>",
  "excerpt": "<compelling 150-character excerpt>",
  "formattingNotes": "<any content formatting observations>"
}

Rules:
- Select 1-3 most relevant categories from the available list
- Generate 5-8 relevant SEO tags
- Write a compelling excerpt that summarizes the post
- Be strategic about tags for SEO and discoverability`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  function sendEvent(
    controller: ReadableStreamDefaultController,
    data: Record<string, unknown>
  ) {
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
    );
  }

  try {
    const body: PublishRequest = await req.json();
    const {
      siteId,
      contentId,
      externalContentId,
      contentSource,
      postTitle,
      postSlug,
      postStatus,
      featuredImageUrl,
      contentHtml: directHtml,
    } = body;

    if (!siteId || !postTitle) {
      return Response.json(
        { error: "siteId and postTitle are required" },
        { status: 400 }
      );
    }

    // Fetch site
    const site = await getSiteById(siteId);
    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    // Get content
    let html = directHtml || "";
    if (contentSource === "platform" && contentId) {
      const content = await getGeneratedContentById(contentId);
      if (!content) {
        return Response.json({ error: "Content not found" }, { status: 404 });
      }
      html = content.contentHtml;
    } else if (contentSource === "external" && externalContentId) {
      const extContent = await getExternalContentById(externalContentId);
      if (!extContent) {
        return Response.json({ error: "External content not found" }, { status: 404 });
      }
      html = extContent.contentHtml || extContent.contentMarkdown || "";
    }

    if (!html) {
      return Response.json({ error: "No content to publish" }, { status: 400 });
    }

    // Create job record
    const job = await createJob({
      siteId,
      contentProjectId: contentSource === "platform" ? contentId : undefined,
      externalContentId: contentSource === "external" ? externalContentId : undefined,
      contentSource,
      postTitle,
      postSlug,
      postStatus,
      featuredImageUrl,
      status: "analyzing",
      agentLog: [],
    });

    const password = decryptPassword(site.wpAppPasswordEncrypted);
    const creds = {
      siteUrl: site.siteUrl,
      username: site.wpUsername,
      password,
    };
    const categories = (site.categoriesCache as WPCategory[]) || [];

    // Streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const log: { timestamp: string; step: string; message: string; success: boolean }[] = [];

        function logStep(step: string, message: string, success = true) {
          const entry = {
            timestamp: new Date().toISOString(),
            step,
            message,
            success,
          };
          log.push(entry);
          sendEvent(controller, { type: "step", ...entry });
        }

        try {
          // Step 1: AI Analysis
          logStep("analyzing", "Analyzing content for categories, tags, and excerpt...");

          let selectedCategories: number[] = [];
          let selectedTags: string[] = [];
          let excerpt = "";

          const apiKey = process.env.OPENROUTER_API_KEY;
          if (apiKey && categories.length > 0) {
            try {
              const settings = await getSettings();
              const analysisRes = await fetch(
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
                    messages: [
                      {
                        role: "user",
                        content: buildAnalysisPrompt(html, categories, site.siteName),
                      },
                    ],
                    max_tokens: 1000,
                    temperature: 0.3,
                  }),
                }
              );

              if (analysisRes.ok) {
                const analysisData = await analysisRes.json();
                const analysisText =
                  analysisData.choices?.[0]?.message?.content || "";

                // Parse JSON from response
                const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const analysis = JSON.parse(jsonMatch[0]);
                  selectedCategories = analysis.categories || [];
                  selectedTags = analysis.tags || [];
                  excerpt = analysis.excerpt || "";

                  logStep(
                    "analyzed",
                    `Selected ${selectedCategories.length} categories, ${selectedTags.length} tags. Excerpt: "${excerpt.slice(0, 80)}..."`
                  );
                }
              }
            } catch (err) {
              logStep(
                "analysis_warning",
                `AI analysis skipped: ${err instanceof Error ? err.message : String(err)}. Publishing with defaults.`,
                false
              );
            }
          } else {
            logStep(
              "analysis_skipped",
              "No categories available or API key not configured. Publishing with defaults."
            );
          }

          await updateJob(job.id, {
            status: "publishing",
            selectedCategories,
            selectedTags,
            excerpt,
            agentLog: log,
          });

          // Step 2: Upload featured image
          let featuredMediaId: number | undefined;
          if (featuredImageUrl) {
            logStep("uploading_image", "Uploading featured image to WordPress media library...");

            const mediaResult = await uploadMedia(creds, featuredImageUrl);
            if (mediaResult.success && mediaResult.mediaId) {
              featuredMediaId = mediaResult.mediaId;
              logStep("image_uploaded", `Featured image uploaded (Media ID: ${mediaResult.mediaId})`);
            } else {
              logStep(
                "image_failed",
                `Featured image upload failed: ${mediaResult.error}. Continuing without featured image.`,
                false
              );
            }
          }

          // Step 3: Create/find tags in WordPress
          let tagIds: number[] = [];
          if (selectedTags.length > 0) {
            logStep("creating_tags", `Creating/finding ${selectedTags.length} tags in WordPress...`);
            tagIds = await createOrFindTags(creds, selectedTags);
            logStep("tags_ready", `${tagIds.length} tags ready`);
          }

          // Step 4: Publish the post
          logStep(
            "publishing",
            `Publishing "${postTitle}" as ${postStatus} to ${site.siteName}...`
          );

          const publishResult = await publishPost(creds, {
            title: postTitle,
            content: html,
            status: postStatus,
            categories: selectedCategories,
            tags: tagIds,
            excerpt,
            slug: postSlug,
            featured_media: featuredMediaId,
          });

          if (!publishResult.success) {
            logStep("publish_failed", `Publishing failed: ${publishResult.error}`, false);

            await updateJob(job.id, {
              status: "failed",
              errorMessage: publishResult.error,
              agentLog: log,
            });

            sendEvent(controller, {
              type: "result",
              success: false,
              error: publishResult.error,
              jobId: job.id,
            });

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          logStep(
            "published",
            `Post published successfully! WordPress Post ID: ${publishResult.postId}`
          );

          await updateJob(job.id, {
            status: "verifying",
            publishedPostId: publishResult.postId,
            publishedUrl: publishResult.url,
            agentLog: log,
          });

          // Step 5: Verify the published post
          if (publishResult.url && postStatus === "publish") {
            logStep("verifying", `Verifying published post at ${publishResult.url}...`);

            // Brief delay for WordPress to process
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const verification = await verifyPost(publishResult.url);

            logStep(
              "verified",
              verification.success
                ? `Verification passed: ${verification.notes}`
                : `Verification note: ${verification.notes}`,
              verification.success
            );

            await updateJob(job.id, {
              status: "completed",
              verificationStatus: verification.success ? "verified" : "failed",
              verificationNotes: verification.notes,
              agentLog: log,
            });
          } else {
            await updateJob(job.id, {
              status: "completed",
              verificationStatus: postStatus === "draft" ? "pending" : "pending",
              verificationNotes:
                postStatus === "draft"
                  ? "Post saved as draft — verification skipped."
                  : "Verification skipped.",
              agentLog: log,
            });

            logStep(
              "complete",
              postStatus === "draft"
                ? "Post saved as draft in WordPress. Review in wp-admin when ready."
                : "Publishing complete."
            );
          }

          // Final result
          sendEvent(controller, {
            type: "result",
            success: true,
            postId: publishResult.postId,
            url: publishResult.url,
            postStatus,
            jobId: job.id,
            categoriesApplied: selectedCategories.length,
            tagsApplied: tagIds.length,
          });
        } catch (err) {
          logStep("error", `Unexpected error: ${err instanceof Error ? err.message : String(err)}`, false);

          await updateJob(job.id, {
            status: "failed",
            errorMessage: String(err),
            agentLog: log,
          });

          sendEvent(controller, {
            type: "result",
            success: false,
            error: String(err),
            jobId: job.id,
          });
        } finally {
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
    return Response.json(
      { error: "Publishing failed", details: String(err) },
      { status: 500 }
    );
  }
}

"use client";

import { useState, useCallback, useRef } from "react";

export interface AgentStep {
  timestamp: string;
  step: string;
  message: string;
  success: boolean;
}

export interface PublishResult {
  success: boolean;
  postId?: number;
  url?: string;
  postStatus?: string;
  jobId?: string;
  error?: string;
  categoriesApplied?: number;
  tagsApplied?: number;
}

export interface PublishConfig {
  siteId: string;
  contentId?: string;
  externalContentId?: string;
  contentSource: "platform" | "external";
  postTitle: string;
  postSlug?: string;
  postStatus: "draft" | "publish";
  featuredImageUrl?: string;
  contentHtml?: string;
}

export function usePublishingAgent() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const publish = useCallback(async (config: PublishConfig) => {
    setIsPublishing(true);
    setSteps([]);
    setResult(null);
    setError(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/wordpress/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Publishing failed");
        setIsPublishing(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            setIsPublishing(false);
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "step") {
              setSteps((prev) => [
                ...prev,
                {
                  timestamp: parsed.timestamp,
                  step: parsed.step,
                  message: parsed.message,
                  success: parsed.success,
                },
              ]);
            } else if (parsed.type === "result") {
              setResult(parsed);
              if (!parsed.success) {
                setError(parsed.error);
              }
            }
          } catch {
            // skip unparseable
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Publishing cancelled");
      } else {
        setError(
          err instanceof Error ? err.message : "Publishing failed"
        );
      }
    } finally {
      setIsPublishing(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setSteps([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    publish,
    cancel,
    reset,
    isPublishing,
    steps,
    result,
    error,
  };
}

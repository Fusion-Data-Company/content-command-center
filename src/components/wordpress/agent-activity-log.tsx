"use client";

import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { AgentStep, PublishResult } from "@/hooks/use-publishing-agent";

interface AgentActivityLogProps {
  steps: AgentStep[];
  isPublishing: boolean;
  result: PublishResult | null;
  error: string | null;
}

export function AgentActivityLog({
  steps,
  isPublishing,
  result,
  error,
}: AgentActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, result]);

  if (steps.length === 0 && !isPublishing && !result) {
    return null;
  }

  return (
    <div className="rounded-xl bg-bg border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        {isPublishing ? (
          <Loader2 size={14} className="animate-spin text-accent" />
        ) : result?.success ? (
          <CheckCircle2 size={14} className="text-success" />
        ) : error ? (
          <XCircle size={14} className="text-danger" />
        ) : (
          <AlertCircle size={14} className="text-text-muted" />
        )}
        <span className="text-xs font-medium text-text-primary">
          {isPublishing
            ? "Publishing in Progress..."
            : result?.success
            ? "Published Successfully"
            : error
            ? "Publishing Failed"
            : "Agent Activity"}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[300px] overflow-y-auto p-3 space-y-1.5"
      >
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-text-muted flex-shrink-0 w-16 tabular-nums">
              {new Date(step.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <span
              className={
                step.success ? "text-text-dim" : "text-danger"
              }
            >
              {step.message}
            </span>
          </div>
        ))}

        {isPublishing && (
          <div className="flex items-center gap-2 text-xs text-accent mt-2">
            <Loader2 size={12} className="animate-spin" />
            <span>Working...</span>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mx-3 mb-3 p-3 rounded-lg ${
            result.success
              ? "bg-success/10 border border-success/20"
              : "bg-danger/10 border border-danger/20"
          }`}
        >
          {result.success ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-success">
                Post {result.postStatus === "draft" ? "saved as draft" : "published"} successfully!
              </p>
              {result.url && (
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline block truncate"
                >
                  {result.url}
                </a>
              )}
              <p className="text-[11px] text-text-dim">
                WordPress Post ID: {result.postId}
                {result.categoriesApplied
                  ? ` · ${result.categoriesApplied} categories`
                  : ""}
                {result.tagsApplied
                  ? ` · ${result.tagsApplied} tags`
                  : ""}
              </p>
            </div>
          ) : (
            <p className="text-xs text-danger">{result.error || error}</p>
          )}
        </div>
      )}
    </div>
  );
}

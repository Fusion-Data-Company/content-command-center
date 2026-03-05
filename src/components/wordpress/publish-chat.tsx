"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, User, MessageSquare } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ContentContext {
  title: string;
  htmlPreview: string;
  imageUrls: string[];
}

interface PublishChatProps {
  siteId: string;
  contentContext: ContentContext;
  contentId: string | null;
}

export function PublishChat({
  siteId,
  contentContext,
  contentId,
}: PublishChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset messages when content changes
  useEffect(() => {
    setMessages([]);
    setStreamingContent("");
    setInput("");
  }, [contentId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setIsStreaming(true);
      setStreamingContent("");

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/wordpress/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId,
            message: text.trim(),
            history: newMessages.slice(-10),
            contentContext,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${err.error || "Failed to get response"}`,
            },
          ]);
          setIsStreaming(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

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
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch {
              // skip
            }
          }
        }

        if (fullContent) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullContent },
          ]);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Failed to get response." },
          ]);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [siteId, contentContext, messages, isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col border border-border rounded-xl bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <MessageSquare size={14} className="text-accent" />
        <span className="text-xs font-medium text-text-primary">
          Publishing Assistant
        </span>
        {isStreaming && (
          <div className="flex gap-1 ml-2">
            <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-[300px] min-h-[120px]">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex items-center justify-center py-6 px-4">
            <div className="text-center">
              <Bot size={24} className="mx-auto text-text-muted mb-2" />
              <p className="text-xs text-text-dim leading-relaxed max-w-xs">
                Ask me about title optimization, category selection, tags, excerpts,
                or anything about publishing this post.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === "user"
                      ? "bg-accent/20"
                      : "bg-surface-2"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User size={10} className="text-accent" />
                  ) : (
                    <Bot size={10} className="text-text-muted" />
                  )}
                </div>
                <div
                  className={`text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "text-text-primary"
                      : "text-text-dim"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isStreaming && streamingContent && (
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-surface-2">
                  <Bot size={10} className="text-text-muted" />
                </div>
                <div className="text-xs leading-relaxed text-text-dim">
                  {streamingContent}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about publishing..."
            disabled={isStreaming}
            className="flex-1 px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg bg-accent text-bg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

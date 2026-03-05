"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/lib/db/schema";

interface UseChatOptions {
  projectId: string;
  initialMessages: ChatMessage[];
}

export function useChat({ projectId, initialMessages }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || !content.trim()) return;

      // Add user message to UI optimistically
      const tempUser: ChatMessage = {
        id: crypto.randomUUID(),
        projectId,
        role: "user",
        content,
        attachments: null,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, tempUser]);
      setIsStreaming(true);
      setStreamingContent("");

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            message: content,
            history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abort.signal,
        });

        if (!res.ok) throw new Error("Request failed");

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) {
              if (
                (e as Error).message &&
                !(e as Error).message.includes("JSON")
              )
                throw e;
            }
          }
        }

        // Add completed assistant message
        if (accumulated) {
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            projectId,
            role: "assistant",
            content: accumulated,
            attachments: null,
            createdAt: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Chat error:", err);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
      }
    },
    [projectId, messages, isStreaming]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const addAttachment = useCallback((file: File) => {
    setAttachments((prev) => [...prev, file]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    stopStreaming,
    attachments,
    addAttachment,
    removeAttachment,
  };
}

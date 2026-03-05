"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";
import type { ChatMessage } from "@/lib/db/schema";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
}

export function MessageList({
  messages,
  isStreaming,
  streamingContent,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.map((msg, i) => (
        <MessageBubble key={msg.id} message={msg} index={i} />
      ))}
      {isStreaming && streamingContent && (
        <MessageBubble
          message={{
            id: "streaming",
            projectId: "",
            role: "assistant",
            content: streamingContent,
            attachments: null,
            createdAt: new Date(),
          }}
          isStreaming
          index={messages.length}
        />
      )}
    </div>
  );
}

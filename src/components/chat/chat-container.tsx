"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { SuggestionChips } from "./suggestion-chips";
import { OutputPanel } from "@/components/output/output-panel";
import { PanelResizer } from "@/components/layout/panel-resizer";
import {
  hasSectionMarkers,
  parseAllSections,
  hasImagePrompts,
  extractImagePrompts,
  extractSection,
} from "@/lib/content/parser";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { PanelRight, PanelRightClose } from "lucide-react";
import type { ChatMessage } from "@/lib/db/schema";

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  type: string;
  prompt: string;
}

interface ChatContainerProps {
  projectId: string;
  initialMessages: ChatMessage[];
  projectTitle: string;
}

export function ChatContainer({
  projectId,
  initialMessages,
  projectTitle,
}: ChatContainerProps) {
  const chat = useChat({ projectId, initialMessages });
  const [outputVisible, setOutputVisible] = useState(false);
  const [outputWidth, setOutputWidth] = useState(440);
  const [parsedSections, setParsedSections] = useState<Record<string, string>>(
    {}
  );
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [infographicImage, setInfographicImage] = useState<GeneratedImage | null>(null);
  const [isGeneratingInfographic, setIsGeneratingInfographic] = useState(false);
  const lastContentRef = useRef("");
  const imagePromptsProcessedRef = useRef<Set<string>>(new Set());
  const infographicProcessedRef = useRef<Set<string>>(new Set());

  // Generate images from prompts
  const generateImagesFromPrompts = useCallback(
    async (content: string) => {
      const prompts = extractImagePrompts(content);
      if (prompts.length === 0) return;

      // Deduplicate - don't regenerate for the same prompts
      const newPrompts = prompts.filter(
        (p) => !imagePromptsProcessedRef.current.has(p.description)
      );
      if (newPrompts.length === 0) return;

      setIsGeneratingImages(true);
      setOutputVisible(true);

      for (const prompt of newPrompts) {
        imagePromptsProcessedRef.current.add(prompt.description);

        try {
          const res = await fetch("/api/images/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `${prompt.style}. ${prompt.description}`,
              aspectRatio: prompt.aspectRatio,
              resolution: "1K",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.images && data.images.length > 0) {
              const newImages: GeneratedImage[] = data.images.map(
                (img: { url: string; width: number; height: number }) => ({
                  url: img.url,
                  width: img.width,
                  height: img.height,
                  type: prompt.type,
                  prompt: prompt.description,
                })
              );
              setGeneratedImages((prev) => [...prev, ...newImages]);
            }
          }
        } catch (err) {
          console.error("Image generation failed:", err);
        }
      }

      setIsGeneratingImages(false);
    },
    []
  );

  // Parse sections from the latest assistant message or streaming content
  useEffect(() => {
    const contentToCheck = chat.isStreaming
      ? chat.streamingContent
      : chat.messages.filter((m) => m.role === "assistant").pop()?.content ||
        "";

    if (contentToCheck && contentToCheck !== lastContentRef.current) {
      lastContentRef.current = contentToCheck;
      if (hasSectionMarkers(contentToCheck)) {
        const sections = parseAllSections(contentToCheck);
        setParsedSections(sections);
        if (!outputVisible && Object.keys(sections).length > 0) {
          setOutputVisible(true);
        }
      }
    }
  }, [chat.messages, chat.streamingContent, chat.isStreaming, outputVisible]);

  // Auto-trigger image generation when streaming completes and content has image prompts
  useEffect(() => {
    if (chat.isStreaming) return; // Wait for streaming to finish

    const lastAssistant = chat.messages
      .filter((m) => m.role === "assistant")
      .pop();
    if (!lastAssistant) return;

    if (hasImagePrompts(lastAssistant.content)) {
      generateImagesFromPrompts(lastAssistant.content);
    }
  }, [chat.isStreaming, chat.messages, generateImagesFromPrompts]);

  // Phase 2: Auto-generate infographic by analyzing completed blog content
  useEffect(() => {
    if (chat.isStreaming) return;

    const lastAssistant = chat.messages
      .filter((m) => m.role === "assistant")
      .pop();
    if (!lastAssistant) return;

    const blogContent = extractSection(lastAssistant.content, "blog");
    if (!blogContent || blogContent.length < 200) return;

    // Deduplicate using a hash of the first 100 chars
    const contentKey = blogContent.slice(0, 100);
    if (infographicProcessedRef.current.has(contentKey)) return;
    infographicProcessedRef.current.add(contentKey);

    const generateInfographic = async () => {
      setIsGeneratingInfographic(true);
      setOutputVisible(true);

      try {
        const res = await fetch("/api/infographic/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blogContent }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.images?.length > 0) {
            const img = data.images[0];
            const infographic: GeneratedImage = {
              url: img.url,
              width: img.width,
              height: img.height,
              type: "infographic",
              prompt: data.analysis?.prompt || "Auto-generated infographic",
            };
            setInfographicImage(infographic);
            setGeneratedImages((prev) => [...prev, infographic]);
          }
        }
      } catch (err) {
        console.error("Infographic generation failed:", err);
      } finally {
        setIsGeneratingInfographic(false);
      }
    };

    generateInfographic();
  }, [chat.isStreaming, chat.messages]);

  // Manual image generation trigger
  const handleGenerateImage = useCallback(async (prompt: string) => {
    setIsGeneratingImages(true);
    setOutputVisible(true);

    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio: "16:9",
          resolution: "1K",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.images?.length > 0) {
          const newImages: GeneratedImage[] = data.images.map(
            (img: { url: string; width: number; height: number }) => ({
              url: img.url,
              width: img.width,
              height: img.height,
              type: "custom",
              prompt,
            })
          );
          setGeneratedImages((prev) => [...prev, ...newImages]);
        }
      }
    } catch (err) {
      console.error("Image generation failed:", err);
    } finally {
      setIsGeneratingImages(false);
    }
  }, []);

  const isEmpty = chat.messages.length === 0;

  return (
    <div className="h-full flex">
      {/* Chat Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div>
            <h1 className="font-heading text-base font-semibold text-text-primary">
              {projectTitle}
            </h1>
            {(chat.isStreaming || isGeneratingImages || isGeneratingInfographic) && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-accent">
                  {isGeneratingInfographic
                    ? "Analyzing content & generating infographic..."
                    : isGeneratingImages
                      ? "Generating images..."
                      : "Generating..."}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {generatedImages.length > 0 && (
              <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-md">
                {generatedImages.length} image
                {generatedImages.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => setOutputVisible(!outputVisible)}
              className="p-2 rounded-lg hover:bg-surface-2 text-text-dim hover:text-text-primary transition-colors"
              title={outputVisible ? "Hide output" : "Show output"}
            >
              {outputVisible ? (
                <PanelRightClose size={18} />
              ) : (
                <PanelRight size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Messages or Empty State */}
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-lg">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                <Image
                  src="/logo.png"
                  alt="Marketing Strategy"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
                What would you like to create?
              </h2>
              <p className="text-text-dim text-sm mb-6 leading-relaxed">
                Describe the content you need and I&apos;ll guide you through a
                strategic intake process, then generate publication-ready content
                with SEO optimization and custom images.
              </p>
              <SuggestionChips onSelect={chat.sendMessage} />
            </div>
          </div>
        ) : (
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            streamingContent={chat.streamingContent}
          />
        )}

        {/* Input */}
        <ChatInput
          onSend={chat.sendMessage}
          onStop={chat.stopStreaming}
          isStreaming={chat.isStreaming}
          attachments={chat.attachments}
          onAttach={chat.addAttachment}
          onRemoveAttachment={chat.removeAttachment}
        />
      </div>

      {/* Output Panel */}
      {outputVisible && (
        <>
          <PanelResizer
            onResize={(delta) =>
              setOutputWidth((w) => Math.max(320, Math.min(700, w - delta)))
            }
          />
          <div
            style={{ width: outputWidth }}
            className="flex-shrink-0 border-l border-border h-full overflow-hidden"
          >
            <OutputPanel
              sections={parsedSections}
              isStreaming={chat.isStreaming}
              images={generatedImages}
              isGeneratingImages={isGeneratingImages}
              onGenerateImage={handleGenerateImage}
              infographicImage={infographicImage}
              isGeneratingInfographic={isGeneratingInfographic}
              onClose={() => setOutputVisible(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

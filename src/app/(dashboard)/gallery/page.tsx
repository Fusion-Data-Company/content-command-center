"use client";

import { useEffect, useState } from "react";
import { GalleryPostsTab } from "@/components/gallery/gallery-posts-tab";
import { GalleryImagesTab } from "@/components/gallery/gallery-images-tab";
import { FileText, Image as ImageIcon, Loader2 } from "lucide-react";

interface GalleryContent {
  id: string;
  projectId: string;
  projectTitle: string | null;
  version: number;
  contentHtml: string;
  contentMarkdown: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  urlSlug: string | null;
  createdAt: string;
}

interface GalleryImage {
  id: string;
  projectId: string;
  projectTitle: string | null;
  imageType: string | null;
  imageUrl: string;
  altText: string | null;
  generationPrompt: string | null;
  dimensions: string | null;
  createdAt: string;
}

type Tab = "posts" | "images";

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [content, setContent] = useState<GalleryContent[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content || []);
        setImages(data.images || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-accent animate-spin mx-auto mb-3" />
          <p className="text-text-dim text-sm">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">
            Gallery
          </h1>
          <p className="text-text-dim text-xs mt-0.5">
            All generated posts and images across every project
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{content.length} post{content.length !== 1 ? "s" : ""}</span>
          <span className="text-border">|</span>
          <span>{images.length} image{images.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3">
        <button
          onClick={() => setActiveTab("posts")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "posts"
              ? "bg-accent/10 text-accent"
              : "text-text-dim hover:text-text-primary hover:bg-surface-2"
          }`}
        >
          <FileText size={16} />
          Posts
          {content.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-surface-2 text-[10px] font-bold">
              {content.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("images")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "images"
              ? "bg-accent/10 text-accent"
              : "text-text-dim hover:text-text-primary hover:bg-surface-2"
          }`}
        >
          <ImageIcon size={16} />
          Images
          {images.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-surface-2 text-[10px] font-bold">
              {images.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "posts" ? (
          <GalleryPostsTab content={content} />
        ) : (
          <GalleryImagesTab images={images} />
        )}
      </div>
    </div>
  );
}

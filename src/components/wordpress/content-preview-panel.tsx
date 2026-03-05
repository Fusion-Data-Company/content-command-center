"use client";

import { useState, useRef } from "react";
import { X, Image as ImageIcon, Upload, Loader2, Check, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface ImageItem {
  id: string;
  imageUrl: string;
  imageType: string | null;
  generationPrompt: string | null;
}

interface ContentPreviewPanelProps {
  content: {
    html: string;
    markdown?: string;
    title: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
  } | null;
  images: ImageItem[];
  selectedFeaturedImage: string | null;
  onSelectFeaturedImage: (url: string | null) => void;
  onUploadImage: (url: string) => void;
  onClose: () => void;
}

export function ContentPreviewPanel({
  content,
  images,
  selectedFeaturedImage,
  onSelectFeaturedImage,
  onUploadImage,
  onClose,
}: ContentPreviewPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeSection, setActiveSection] = useState<"preview" | "images">(
    "preview"
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const blogHtml = content?.markdown
    ? DOMPurify.sanitize(marked.parse(content.markdown, { async: false }) as string)
    : DOMPurify.sanitize(content?.html || "");

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onUploadImage(data.url);
        onSelectFeaturedImage(data.url);
        toast.success("Image uploaded");
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveSection("preview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeSection === "preview"
                ? "bg-accent/10 text-accent"
                : "text-text-dim hover:text-text-primary"
            }`}
          >
            <Eye size={14} className="inline mr-1.5" />
            Preview
          </button>
          <button
            onClick={() => setActiveSection("images")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
              activeSection === "images"
                ? "bg-accent/10 text-accent"
                : "text-text-dim hover:text-text-primary"
            }`}
          >
            <ImageIcon size={14} className="inline mr-1.5" />
            Images
            {images.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-bg text-[10px] font-bold flex items-center justify-center">
                {images.length}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === "preview" ? (
          content ? (
            <div className="flex flex-col">
              {/* Meta info */}
              <div className="px-4 py-3 border-b border-border space-y-1">
                <h3 className="font-heading text-sm font-semibold text-text-primary">
                  {content.metaTitle || content.title}
                </h3>
                {content.metaDescription && (
                  <p className="text-xs text-text-dim line-clamp-2">
                    {content.metaDescription}
                  </p>
                )}
              </div>

              {/* Featured image banner */}
              {selectedFeaturedImage && (
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon size={12} className="text-accent" />
                    <span className="text-[11px] text-accent font-medium">
                      Featured Image
                    </span>
                  </div>
                  <img
                    src={selectedFeaturedImage}
                    alt="Featured"
                    className="w-full rounded-lg border border-accent/30 object-contain"
                  />
                </div>
              )}

              {/* Blog HTML preview */}
              <div
                className="px-4 py-4 prose prose-sm prose-invert max-w-none
                  prose-headings:font-heading prose-headings:text-text-primary
                  prose-p:text-text-dim prose-p:text-sm prose-p:leading-relaxed
                  prose-a:text-accent prose-strong:text-text-primary
                  prose-li:text-text-dim prose-li:text-sm"
                dangerouslySetInnerHTML={{ __html: blogHtml }}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <FileText size={32} className="mx-auto text-text-muted mb-3" />
                <p className="text-sm text-text-muted">No content to preview</p>
              </div>
            </div>
          )
        ) : (
          <div className="p-4 space-y-4">
            {/* Image grid */}
            {images.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-text-dim">
                  Click an image to set it as the featured image for this post.
                </p>
                <div className="space-y-3">
                  {images.map((img) => (
                    <button
                      key={img.id}
                      onClick={() =>
                        onSelectFeaturedImage(
                          selectedFeaturedImage === img.imageUrl
                            ? null
                            : img.imageUrl
                        )
                      }
                      className={`relative w-full rounded-lg overflow-hidden border-2 transition-all group ${
                        selectedFeaturedImage === img.imageUrl
                          ? "border-accent ring-2 ring-accent/20"
                          : "border-border hover:border-border-hover"
                      }`}
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.imageType || "Generated image"}
                        className="w-full h-auto object-contain"
                      />
                      {selectedFeaturedImage === img.imageUrl && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                          <Check size={14} className="text-bg" />
                        </div>
                      )}
                      {img.imageType && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                          <span className="text-[10px] text-white/80 capitalize">
                            {img.imageType}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon
                  size={32}
                  className="mx-auto text-text-muted mb-3"
                />
                <p className="text-sm text-text-muted mb-1">
                  No images found for this content
                </p>
                <p className="text-xs text-text-dim">
                  Upload an image below to use as the featured image.
                </p>
              </div>
            )}

            {/* Upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-border-hover"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
                className="hidden"
              />
              {uploading ? (
                <Loader2
                  size={20}
                  className="mx-auto animate-spin text-accent mb-2"
                />
              ) : (
                <Upload size={20} className="mx-auto text-text-muted mb-2" />
              )}
              <p className="text-xs text-text-dim">
                {uploading
                  ? "Uploading..."
                  : "Drop image here or click to upload"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, FileUp } from "lucide-react";
import { toast } from "sonner";

interface ExternalUploadProps {
  onUploaded: () => void;
}

export function ExternalUpload({ onUploaded }: ExternalUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);

    try {
      // Read file content
      const text = await file.text();
      const isHtml =
        file.name.endsWith(".html") || file.name.endsWith(".htm");
      const isMarkdown =
        file.name.endsWith(".md") || file.name.endsWith(".markdown");

      // Extract title from content
      let title = file.name.replace(/\.\w+$/, "");
      if (isHtml) {
        const titleMatch = text.match(/<title>(.*?)<\/title>/i);
        const h1Match = text.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (titleMatch) title = titleMatch[1];
        else if (h1Match) title = h1Match[1].replace(/<[^>]*>/g, "");
      } else if (isMarkdown) {
        const h1Match = text.match(/^#\s+(.+)$/m);
        if (h1Match) title = h1Match[1];
      }

      // Upload to Vercel Blob
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      let uploadedFileUrl: string | undefined;
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        uploadedFileUrl = uploadData.url;
      }

      // Create external content record
      const res = await fetch("/api/wordpress/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contentHtml: isHtml ? text : undefined,
          contentMarkdown: isMarkdown ? text : undefined,
          uploadedFileUrl,
          uploadedFileName: file.name,
          fileType: isHtml ? "html" : isMarkdown ? "markdown" : "text",
        }),
      });

      if (res.ok) {
        toast.success(`"${title}" uploaded`);
        onUploaded();
      } else {
        toast.error("Failed to save content");
      }
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragOver
          ? "border-accent bg-accent/5"
          : "border-border hover:border-border-hover"
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".html,.htm,.md,.markdown,.txt"
        onChange={handleChange}
        className="hidden"
      />

      {uploading ? (
        <Loader2 size={24} className="mx-auto animate-spin text-accent mb-2" />
      ) : dragOver ? (
        <FileUp size={24} className="mx-auto text-accent mb-2" />
      ) : (
        <Upload size={24} className="mx-auto text-text-muted mb-2" />
      )}

      <p className="text-xs text-text-dim">
        {uploading
          ? "Uploading..."
          : "Drop HTML or Markdown file here, or click to browse"}
      </p>
    </div>
  );
}

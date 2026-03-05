"use client";

interface BlogPreviewProps {
  html: string;
}

export function BlogPreview({ html }: BlogPreviewProps) {
  return (
    <div className="p-5">
      <div
        className="markdown-output text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

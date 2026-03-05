"use client";

import { FileText, Calendar } from "lucide-react";

interface ContentCardProps {
  title: string;
  subtitle?: string;
  date: string;
  selected?: boolean;
  onClick: () => void;
}

export function ContentCard({
  title,
  subtitle,
  date,
  selected,
  onClick,
}: ContentCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selected
          ? "border-accent bg-accent/5"
          : "border-border hover:border-border-hover bg-surface"
      }`}
    >
      <div className="flex items-start gap-2">
        <FileText
          size={14}
          className={`mt-0.5 flex-shrink-0 ${
            selected ? "text-accent" : "text-text-muted"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium truncate ${
              selected ? "text-accent" : "text-text-primary"
            }`}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-text-muted truncate mt-0.5">
              {subtitle}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
            <Calendar size={10} />
            <span>
              {new Date(date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

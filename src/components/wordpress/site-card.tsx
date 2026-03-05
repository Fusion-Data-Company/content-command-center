"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { ConnectionBadge } from "./connection-badge";
import type { WordPressSite } from "@/lib/db/schema";
import { useState } from "react";
import { toast } from "sonner";

type SafeSite = Omit<WordPressSite, "wpAppPasswordEncrypted">;

interface SiteCardProps {
  site: SafeSite;
  onDeleted?: () => void;
}

export function SiteCard({ site, onDeleted }: SiteCardProps) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTesting(true);
    try {
      const res = await fetch(`/api/wordpress/sites/${site.id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Connected! Found ${data.categoryCount} categories, ${data.tagCount} tags.`
        );
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${site.siteName}"? This will also delete all publishing jobs for this site.`)) {
      return;
    }
    try {
      await fetch(`/api/wordpress/sites/${site.id}`, { method: "DELETE" });
      toast.success("Site deleted");
      onDeleted?.();
    } catch {
      toast.error("Failed to delete site");
    }
  };

  return (
    <div
      onClick={() => router.push(`/wordpress/${site.id}`)}
      className="p-5 rounded-xl bg-surface border border-border hover:border-border-hover transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-text-primary group-hover:text-accent transition-colors">
            {site.siteName}
          </h3>
          <p className="text-xs text-text-muted mt-0.5 truncate max-w-[240px]">
            {site.siteUrl}
          </p>
        </div>
        <ConnectionBadge status={site.connectionStatus} />
      </div>

      {(site.clientName || site.clientIndustry) && (
        <div className="mb-3 text-xs text-text-dim">
          {site.clientName && <span>{site.clientName}</span>}
          {site.clientName && site.clientIndustry && <span> &middot; </span>}
          {site.clientIndustry && <span>{site.clientIndustry}</span>}
        </div>
      )}

      {site.description && (
        <p className="text-xs text-text-muted mb-3 line-clamp-2">
          {site.description}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/wordpress/${site.id}`);
          }}
          className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 text-xs font-medium transition-colors"
        >
          Open
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          title="Test connection"
        >
          <RefreshCw size={14} className={testing ? "animate-spin" : ""} />
        </button>
        <a
          href={site.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
          title="Open site"
        >
          <ExternalLink size={14} />
        </a>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors ml-auto"
          title="Delete site"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

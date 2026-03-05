"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Globe,
  Plus,
  ArrowLeft,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import type { WordPressSite } from "@/lib/db/schema";

interface SiteSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function SiteSidebar({ collapsed, onToggleCollapse }: SiteSidebarProps) {
  const [sites, setSites] = useState<Omit<WordPressSite, "wpAppPasswordEncrypted">[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/wordpress/sites")
      .then((r) => r.json())
      .then((data) => setSites(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathname]);

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 bg-surface border-r border-border">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-surface-2 text-text-dim hover:text-text-primary transition-colors mb-4"
        >
          <Globe size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-accent" />
          <span className="font-heading font-semibold text-sm text-text-primary">
            Publishing Hub
          </span>
        </div>
        <button
          onClick={() => router.push("/")}
          className="p-1.5 rounded-lg hover:bg-surface-2 text-text-dim hover:text-text-primary transition-colors"
          title="Back to Command Center"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      {/* Add Site Button */}
      <div className="px-3 pt-3">
        <button
          onClick={() => router.push("/wordpress")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Site
        </button>
      </div>

      {/* Sites List */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted px-2 mb-2">
          Connected Sites
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-text-muted" />
          </div>
        ) : sites.length === 0 ? (
          <p className="text-text-muted text-xs px-2 py-4">
            No sites connected yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {sites.map((site) => {
              const isActive = pathname === `/wordpress/${site.id}`;
              return (
                <button
                  key={site.id}
                  onClick={() => router.push(`/wordpress/${site.id}`)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "hover:bg-surface-2 text-text-dim hover:text-text-primary"
                  }`}
                >
                  {site.connectionStatus === "success" ? (
                    <Wifi size={14} className="text-success flex-shrink-0" />
                  ) : (
                    <WifiOff size={14} className="text-danger flex-shrink-0" />
                  )}
                  <span className="truncate">{site.siteName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2">
        <button
          onClick={() => router.push("/wordpress")}
          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/wordpress"
              ? "bg-accent/10 text-accent"
              : "hover:bg-surface-2 text-text-dim hover:text-text-primary"
          }`}
        >
          <Globe size={16} />
          Dashboard
        </button>
      </div>
    </div>
  );
}

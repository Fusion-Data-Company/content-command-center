"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Globe, Loader2 } from "lucide-react";
import { SiteCard } from "@/components/wordpress/site-card";
import { AddSiteDialog } from "@/components/wordpress/add-site-dialog";
import { DemoSiteButton } from "@/components/wordpress/demo-site-button";
import { JobStatusBadge } from "@/components/wordpress/job-status-badge";
import type { WordPressSite, PublishingJob } from "@/lib/db/schema";

type SafeSite = Omit<WordPressSite, "wpAppPasswordEncrypted">;

export default function WordPressDashboard() {
  const [sites, setSites] = useState<SafeSite[]>([]);
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sitesRes, jobsRes] = await Promise.all([
        fetch("/api/wordpress/sites"),
        fetch("/api/wordpress/publish").catch(() => null),
      ]);

      const sitesData = await sitesRes.json();
      setSites(sitesData);

      // Jobs endpoint doesn't exist as GET yet — that's fine, we'll show sites for now
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-3">
            <Globe size={28} className="text-accent" />
            WordPress Publishing Hub
          </h1>
          <p className="text-sm text-text-dim mt-1">
            Manage your WordPress sites and publish content from one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DemoSiteButton onCreated={loadData} variant="compact" />
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent-hover transition-colors"
          >
            <Plus size={16} />
            Add Site
          </button>
        </div>
      </div>

      {/* Sites Grid */}
      {sites.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <Globe size={48} className="mx-auto text-text-muted mb-4" />
          <h2 className="font-heading text-lg font-semibold text-text-primary mb-2">
            No WordPress Sites Connected
          </h2>
          <p className="text-sm text-text-dim mb-6 max-w-md mx-auto">
            Add your first WordPress site to start publishing content directly
            from the Command Center.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} />
              Add Your First Site
            </button>
            <span className="text-xs text-text-muted">or</span>
            <DemoSiteButton onCreated={loadData} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onDeleted={loadData}
            />
          ))}
        </div>
      )}

      <AddSiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={loadData}
      />
    </div>
  );
}

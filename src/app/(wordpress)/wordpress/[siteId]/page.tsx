"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ExternalLink,
  RefreshCw,
  Loader2,
  Send,
  FileText,
  Upload as UploadIcon,
  Globe,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ContentCard } from "@/components/wordpress/content-card";
import { ExternalUpload } from "@/components/wordpress/external-upload";
import { AgentActivityLog } from "@/components/wordpress/agent-activity-log";
import { ConnectionBadge } from "@/components/wordpress/connection-badge";
import { ContentPreviewPanel } from "@/components/wordpress/content-preview-panel";
import { PublishChat } from "@/components/wordpress/publish-chat";
import { usePublishingAgent } from "@/hooks/use-publishing-agent";
import type { WordPressSite, ExternalContent } from "@/lib/db/schema";

type SafeSite = Omit<WordPressSite, "wpAppPasswordEncrypted">;

interface GeneratedContentItem {
  id: string;
  projectId: string;
  version: number;
  metaTitle: string | null;
  metaDescription: string | null;
  urlSlug: string | null;
  createdAt: string;
  projectTitle: string | null;
}

interface WPPostItem {
  id: number;
  title: { rendered: string };
  link: string;
  status: string;
  date: string;
}

interface ContentPreview {
  html: string;
  markdown?: string;
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

interface PreviewImage {
  id: string;
  imageUrl: string;
  imageType: string | null;
  generationPrompt: string | null;
}

type ContentTab = "platform" | "external" | "wordpress";

export default function SiteWorkspace() {
  const { siteId } = useParams<{ siteId: string }>();

  const [site, setSite] = useState<SafeSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // Content tabs
  const [activeTab, setActiveTab] = useState<ContentTab>("platform");
  const [platformContent, setPlatformContent] = useState<GeneratedContentItem[]>([]);
  const [externalContentList, setExternalContentList] = useState<ExternalContent[]>([]);
  const [wpPosts, setWpPosts] = useState<WPPostItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Selected content
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<"platform" | "external" | null>(null);

  // Content preview (right panel)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [contentPreview, setContentPreview] = useState<ContentPreview | null>(null);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Featured image
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<PreviewImage[]>([]);

  // Publishing config
  const [postTitle, setPostTitle] = useState("");
  const [postSlug, setPostSlug] = useState("");
  const [postStatus, setPostStatus] = useState<"publish" | "draft">("publish");

  const agent = usePublishingAgent();

  // Load site data
  useEffect(() => {
    if (!siteId) return;
    fetch(`/api/wordpress/sites/${siteId}`)
      .then((r) => r.json())
      .then((data) => setSite(data))
      .catch(() => toast.error("Failed to load site"))
      .finally(() => setLoading(false));
  }, [siteId]);

  // Load content based on active tab
  const loadContent = useCallback(async () => {
    setLoadingContent(true);
    try {
      if (activeTab === "platform") {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const projects = await res.json();
          setPlatformContent(
            projects.map((p: any) => ({
              id: p.id,
              projectId: p.id,
              version: 1,
              metaTitle: p.title,
              metaDescription: p.topic,
              urlSlug: null,
              createdAt: p.createdAt,
              projectTitle: p.title,
            }))
          );
        }
      } else if (activeTab === "external") {
        const res = await fetch("/api/wordpress/content");
        if (res.ok) {
          setExternalContentList(await res.json());
        }
      } else if (activeTab === "wordpress" && siteId) {
        const res = await fetch(`/api/wordpress/sites/${siteId}/posts`);
        if (res.ok) {
          setWpPosts(await res.json());
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingContent(false);
    }
  }, [activeTab, siteId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Fetch full content preview when platform content is selected
  const fetchContentPreview = useCallback(async (projectId: string) => {
    setLoadingPreview(true);
    try {
      const [contentRes, imagesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/content`),
        fetch(`/api/projects/${projectId}/images`),
      ]);

      if (contentRes.ok) {
        const contentList = await contentRes.json();
        const latest = contentList.length > 0 ? contentList[0] : null;
        if (latest) {
          setContentPreview({
            html: latest.contentHtml || "",
            markdown: latest.contentMarkdown || undefined,
            title: latest.metaTitle || "",
            metaTitle: latest.metaTitle,
            metaDescription: latest.metaDescription,
          });
        } else {
          setContentPreview(null);
        }
      }

      if (imagesRes.ok) {
        const images = await imagesRes.json();
        setPreviewImages(
          images.map((img: any) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            imageType: img.imageType,
            generationPrompt: img.generationPrompt,
          }))
        );
        // Auto-select first hero/infographic image as featured
        const hero = images.find(
          (img: any) =>
            img.imageType === "hero" || img.imageType === "infographic"
        );
        if (hero) {
          setFeaturedImageUrl(hero.imageUrl);
        }
      }
    } catch {
      setContentPreview(null);
      setPreviewImages([]);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch(`/api/wordpress/sites/${siteId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Connected! ${data.categoryCount} categories, ${data.tagCount} tags.`);
        const siteRes = await fetch(`/api/wordpress/sites/${siteId}`);
        if (siteRes.ok) setSite(await siteRes.json());
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSelectPlatformContent = (item: GeneratedContentItem) => {
    setSelectedContentId(item.id);
    setSelectedSource("platform");
    setPostTitle(item.metaTitle || item.projectTitle || "");
    setPostSlug(item.urlSlug || "");
    setFeaturedImageUrl(null);
    setUploadedImages([]);
    setPreviewOpen(true);
    fetchContentPreview(item.id);
  };

  const handleSelectExternalContent = (item: ExternalContent) => {
    setSelectedContentId(item.id);
    setSelectedSource("external");
    setPostTitle(item.metaTitle || item.title || "");
    setPostSlug("");
    setFeaturedImageUrl(null);
    setUploadedImages([]);
    setPreviewOpen(true);
    setContentPreview({
      html: item.contentHtml || item.contentMarkdown || "",
      markdown: item.contentMarkdown || undefined,
      title: item.title,
      metaTitle: item.metaTitle,
      metaDescription: item.metaDescription,
    });
    setPreviewImages([]);
    setLoadingPreview(false);
  };

  const handleUploadImage = (url: string) => {
    const newImg: PreviewImage = {
      id: `upload-${Date.now()}`,
      imageUrl: url,
      imageType: "uploaded",
      generationPrompt: null,
    };
    setUploadedImages((prev) => [...prev, newImg]);
  };

  const handlePublish = () => {
    if (!selectedContentId || !selectedSource || !postTitle) {
      toast.error("Select content and enter a title first");
      return;
    }

    agent.reset();
    agent.publish({
      siteId,
      contentId: selectedSource === "platform" ? selectedContentId : undefined,
      externalContentId: selectedSource === "external" ? selectedContentId : undefined,
      contentSource: selectedSource,
      postTitle,
      postSlug: postSlug || undefined,
      postStatus,
      featuredImageUrl: featuredImageUrl || undefined,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-muted">Site not found</p>
      </div>
    );
  }

  const categories = (site.categoriesCache as { id: number; name: string; slug: string }[]) || [];
  const allImages = [...previewImages, ...uploadedImages];

  const chatContentContext = {
    title: postTitle,
    htmlPreview: contentPreview?.html || "",
    imageUrls: allImages.map((img) => img.imageUrl),
  };

  return (
    <div className="h-full flex flex-col">
      {/* Site Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-heading text-lg font-semibold text-text-primary">
              {site.siteName}
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-text-muted">{site.siteUrl}</span>
              <ConnectionBadge status={site.connectionStatus} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-dim hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <a
            href={site.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-dim hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <ExternalLink size={13} />
            View Site
          </a>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Column: Content Selection */}
        <div className="w-[420px] flex-shrink-0 border-r border-border flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(
              [
                { key: "platform", label: "Platform Content", icon: FileText },
                { key: "external", label: "External", icon: UploadIcon },
                { key: "wordpress", label: "WP Posts", icon: Globe },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === key
                    ? "border-accent text-accent"
                    : "border-transparent text-text-dim hover:text-text-primary"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Content List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingContent ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-text-muted" />
              </div>
            ) : activeTab === "platform" ? (
              platformContent.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-8">
                  No generated content yet. Create content in the Command Center first.
                </p>
              ) : (
                platformContent.map((item) => (
                  <ContentCard
                    key={item.id}
                    title={item.metaTitle || item.projectTitle || "Untitled"}
                    subtitle={item.metaDescription || undefined}
                    date={item.createdAt}
                    selected={selectedContentId === item.id}
                    onClick={() => handleSelectPlatformContent(item)}
                  />
                ))
              )
            ) : activeTab === "external" ? (
              <>
                <ExternalUpload onUploaded={loadContent} />
                {externalContentList.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">
                    No external content uploaded yet.
                  </p>
                ) : (
                  externalContentList.map((item) => (
                    <ContentCard
                      key={item.id}
                      title={item.title}
                      subtitle={item.uploadedFileName || undefined}
                      date={item.createdAt as unknown as string}
                      selected={selectedContentId === item.id}
                      onClick={() => handleSelectExternalContent(item)}
                    />
                  ))
                )}
              </>
            ) : (
              wpPosts.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-8">
                  {site.connectionStatus === "success"
                    ? "No posts found on this site."
                    : "Connect to view existing posts."}
                </p>
              ) : (
                wpPosts.map((post) => (
                  <a
                    key={post.id}
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-border hover:border-border-hover bg-surface transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-sm font-medium text-text-primary truncate"
                        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                      />
                      <ExternalLink size={12} className="text-text-muted flex-shrink-0 mt-1" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                      <span className="capitalize">{post.status}</span>
                      <span>&middot;</span>
                      <span>
                        {new Date(post.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </a>
                ))
              )
            )}
          </div>
        </div>

        {/* Middle Column: Publishing Config + Chat */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6">
          {selectedContentId && selectedSource ? (
            <div className="space-y-5 max-w-xl">
              <div>
                <h2 className="font-heading text-base font-semibold text-text-primary mb-4">
                  Publishing Configuration
                </h2>

                {/* Title */}
                <div className="mb-4">
                  <label className="text-xs text-text-dim mb-1 block">
                    Post Title
                  </label>
                  <input
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>

                {/* Slug */}
                <div className="mb-4">
                  <label className="text-xs text-text-dim mb-1 block">
                    URL Slug (optional)
                  </label>
                  <input
                    value={postSlug}
                    onChange={(e) => setPostSlug(e.target.value)}
                    placeholder="auto-generated-from-title"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>

                {/* Post Status */}
                <div className="mb-4">
                  <label className="text-xs text-text-dim mb-1.5 block">
                    Post Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPostStatus("publish")}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        postStatus === "publish"
                          ? "bg-accent text-bg"
                          : "bg-surface border border-border text-text-dim hover:text-text-primary"
                      }`}
                    >
                      Publish Live
                    </button>
                    <button
                      onClick={() => setPostStatus("draft")}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        postStatus === "draft"
                          ? "bg-accent text-bg"
                          : "bg-surface border border-border text-text-dim hover:text-text-primary"
                      }`}
                    >
                      Save as Draft
                    </button>
                  </div>
                </div>

                {/* Featured Image Thumbnail */}
                {featuredImageUrl && (
                  <div className="mb-4">
                    <label className="text-xs text-text-dim mb-1.5 block">
                      Featured Image
                    </label>
                    <div className="relative inline-block">
                      <img
                        src={featuredImageUrl}
                        alt="Featured"
                        className="h-20 rounded-lg border border-accent/30 object-cover"
                      />
                      <button
                        onClick={() => setFeaturedImageUrl(null)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-danger/20 hover:border-danger/50 transition-colors"
                      >
                        <X size={10} className="text-text-muted" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Categories info */}
                {categories.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs text-text-dim mb-1 block">
                      Available Categories
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.slice(0, 12).map((cat) => (
                        <span
                          key={cat.id}
                          className="px-2 py-0.5 rounded-full text-[11px] bg-surface-2 text-text-dim border border-border"
                        >
                          {cat.name}
                        </span>
                      ))}
                      {categories.length > 12 && (
                        <span className="px-2 py-0.5 text-[11px] text-text-muted">
                          +{categories.length - 12} more
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">
                      The AI agent will automatically select the best categories and generate tags.
                    </p>
                  </div>
                )}

                {/* Publish Button */}
                <button
                  onClick={handlePublish}
                  disabled={agent.isPublishing || !postTitle}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {agent.isPublishing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {postStatus === "draft"
                        ? "Save Draft with AI Agent"
                        : "Publish with AI Agent"}
                    </>
                  )}
                </button>
              </div>

              {/* Agent Activity Log */}
              <AgentActivityLog
                steps={agent.steps}
                isPublishing={agent.isPublishing}
                result={agent.result}
                error={agent.error}
              />

              {/* Pre-publish Chat */}
              {!agent.isPublishing && !agent.result && (
                <PublishChat
                  siteId={siteId}
                  contentContext={chatContentContext}
                  contentId={selectedContentId}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText
                  size={48}
                  className="mx-auto text-text-muted mb-4"
                />
                <h3 className="font-heading text-base font-semibold text-text-primary mb-1">
                  Select Content to Publish
                </h3>
                <p className="text-xs text-text-dim max-w-sm">
                  Choose content from the left panel — either generated by the
                  platform or uploaded by your team — then configure and publish.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Content Preview Panel */}
        {previewOpen && selectedContentId && (
          <div className="w-[560px] flex-shrink-0 border-l border-border h-full overflow-hidden">
            {loadingPreview ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="animate-spin text-text-muted" />
              </div>
            ) : (
              <ContentPreviewPanel
                content={contentPreview}
                images={allImages}
                selectedFeaturedImage={featuredImageUrl}
                onSelectFeaturedImage={setFeaturedImageUrl}
                onUploadImage={handleUploadImage}
                onClose={() => setPreviewOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

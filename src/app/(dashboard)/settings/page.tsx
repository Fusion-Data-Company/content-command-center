"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Settings,
  Cpu,
  Image as ImageIcon,
  FileText,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface SettingsData {
  id: string;
  chatModel: string;
  chatTemperature: number;
  chatMaxTokens: number;
  defaultImageModel: string;
  defaultAspectRatio: string;
  defaultResolution: string;
  autoGenerateImages: boolean;
  autoGenerateInfographic: boolean;
  defaultContentTone: string;
  targetWordCount: number;
}

interface ApiStatus {
  openrouter: boolean;
  fal: boolean;
  blobStorage: boolean;
  database: boolean;
}

const AI_MODELS = [
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", provider: "Anthropic" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { value: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro", provider: "Google" },
  { value: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
];

const IMAGE_MODELS = [
  { value: "fal-ai/nano-banana-pro", label: "Nano Banana Pro", note: "Gemini 3 Pro Image" },
  { value: "fal-ai/flux-2-pro", label: "FLUX.2 Pro", note: "High quality" },
  { value: "fal-ai/flux-2", label: "FLUX.2", note: "Balanced" },
  { value: "fal-ai/flux/schnell", label: "FLUX Schnell", note: "Fast" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", desc: "Square", w: 20, h: 20 },
  { value: "16:9", label: "16:9", desc: "Wide", w: 28, h: 16 },
  { value: "9:16", label: "9:16", desc: "Tall", w: 16, h: 28 },
  { value: "4:3", label: "4:3", desc: "Standard", w: 24, h: 18 },
  { value: "3:4", label: "3:4", desc: "Portrait", w: 18, h: 24 },
  { value: "3:2", label: "3:2", desc: "Photo", w: 24, h: 16 },
];

const TONES = [
  "professional",
  "casual",
  "technical",
  "conversational",
  "academic",
  "persuasive",
];

const TEMP_LABELS = [
  { value: 0.2, label: "Precise" },
  { value: 0.5, label: "Balanced" },
  { value: 0.7, label: "Creative" },
  { value: 1.0, label: "Wild" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings);
        setApiStatus(data.apiStatus);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = useCallback(
    (updates: Partial<SettingsData>) => {
      if (!settings) return;

      // Optimistic update
      setSettings((prev) => (prev ? { ...prev, ...updates } : prev));

      // Debounced save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          if (res.ok) {
            toast.success("Settings saved");
          } else {
            const err = await res.json();
            toast.error(err.error || "Failed to save");
          }
        } catch {
          toast.error("Failed to save settings");
        }
      }, 600);
    },
    [settings]
  );

  const handleDataAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/settings/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(
          action === "clear-history"
            ? "Chat history cleared"
            : "All projects deleted"
        );
      } else {
        toast.error("Operation failed");
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleExportSettings = () => {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content-command-center-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={32} className="text-accent animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-muted text-sm">Failed to load settings</p>
      </div>
    );
  }

  const tempLabel =
    TEMP_LABELS.reduce((prev, curr) =>
      Math.abs(curr.value - settings.chatTemperature) <
      Math.abs(prev.value - settings.chatTemperature)
        ? curr
        : prev
    ).label;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-text-primary">
              Settings
            </h1>
            <p className="text-text-dim text-xs mt-0.5">
              Configure AI models, image generation, content defaults, and more
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
        {/* ─── Section 1: API Status ─── */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
            Service Status
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { key: "openrouter", label: "OpenRouter", desc: "AI Generation" },
              { key: "fal", label: "fal.ai", desc: "Image Generation" },
              { key: "blobStorage", label: "Vercel Blob", desc: "File Storage" },
              { key: "database", label: "Database", desc: "Neon PostgreSQL" },
            ].map((svc) => {
              const connected = apiStatus?.[svc.key as keyof ApiStatus];
              return (
                <div
                  key={svc.key}
                  className="px-4 py-3 rounded-xl bg-surface border border-border"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {connected ? (
                      <CheckCircle2 size={14} className="text-green-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                    <span className="text-xs font-medium text-text-primary">
                      {svc.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted">{svc.desc}</p>
                  <p
                    className={`text-[10px] mt-1 font-medium ${
                      connected ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {connected ? "Connected" : "Not configured"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Section 2: AI Configuration ─── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={14} className="text-accent" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              AI Configuration
            </h2>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
            {/* Chat Model */}
            <div>
              <label className="text-xs font-medium text-text-primary block mb-2">
                Chat Model
              </label>
              <select
                value={settings.chatModel}
                onChange={(e) => saveSettings({ chatModel: e.target.value })}
                className="w-full max-w-md bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.provider})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-text-muted mt-1.5">
                The AI model used for content generation and chat
              </p>
            </div>

            {/* Temperature / Creativity */}
            <div>
              <label className="text-xs font-medium text-text-primary block mb-2">
                Creativity Level
                <span className="ml-2 text-accent font-normal">
                  {settings.chatTemperature.toFixed(1)} — {tempLabel}
                </span>
              </label>
              <div className="max-w-md">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.chatTemperature}
                  onChange={(e) =>
                    saveSettings({
                      chatTemperature: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#C8FF00] h-1.5 bg-surface-2 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  {TEMP_LABELS.map((t) => (
                    <span
                      key={t.value}
                      className="text-[10px] text-text-muted"
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="text-xs font-medium text-text-primary block mb-2">
                Max Output Length
              </label>
              <div className="flex gap-2 max-w-md">
                {[
                  { label: "8K", value: 8000 },
                  { label: "16K", value: 16000 },
                  { label: "32K", value: 32000 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      saveSettings({ chatMaxTokens: opt.value })
                    }
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      settings.chatMaxTokens === opt.value
                        ? "border-accent/50 bg-accent/5 text-accent"
                        : "border-border text-text-dim hover:border-border-hover hover:text-text-primary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-muted mt-1.5">
                Maximum tokens the AI can generate per response
              </p>
            </div>
          </div>
        </section>

        {/* ─── Section 3: Image Generation ─── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={14} className="text-accent" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Image Generation
            </h2>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
            {/* Image Model */}
            <div>
              <label className="text-xs font-medium text-text-primary block mb-2">
                Default Image Model
              </label>
              <select
                value={settings.defaultImageModel}
                onChange={(e) =>
                  saveSettings({ defaultImageModel: e.target.value })
                }
                className="w-full max-w-md bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50"
              >
                {IMAGE_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} — {m.note}
                  </option>
                ))}
              </select>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-medium text-text-primary block mb-2">
                Default Aspect Ratio
              </label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() =>
                      saveSettings({ defaultAspectRatio: ar.value })
                    }
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      settings.defaultAspectRatio === ar.value
                        ? "border-accent/50 bg-accent/5"
                        : "border-border hover:border-border-hover"
                    }`}
                  >
                    <div
                      style={{ width: ar.w, height: ar.h }}
                      className={`rounded-[2px] border ${
                        settings.defaultAspectRatio === ar.value
                          ? "border-accent bg-accent/20"
                          : "border-text-muted/30"
                      }`}
                    />
                    <div className="text-left">
                      <div
                        className={`text-[11px] font-medium ${
                          settings.defaultAspectRatio === ar.value
                            ? "text-accent"
                            : "text-text-primary"
                        }`}
                      >
                        {ar.label}
                      </div>
                      <div className="text-[9px] text-text-muted">
                        {ar.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="text-xs font-medium text-text-primary block mb-2">
                Default Resolution
              </label>
              <div className="flex gap-2 max-w-xs">
                {["1K", "2K", "4K"].map((res) => (
                  <button
                    key={res}
                    onClick={() =>
                      saveSettings({ defaultResolution: res })
                    }
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      settings.defaultResolution === res
                        ? "border-accent/50 bg-accent/5 text-accent"
                        : "border-border text-text-dim hover:border-border-hover hover:text-text-primary"
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-generate toggles */}
            <div className="space-y-3 pt-2 border-t border-border">
              <ToggleRow
                label="Auto-generate hero images"
                description="Automatically create images when the AI includes image prompts in content"
                checked={settings.autoGenerateImages}
                onChange={(v) => saveSettings({ autoGenerateImages: v })}
              />
              <ToggleRow
                label="Auto-generate infographic"
                description="Automatically analyze blog content and generate an infographic"
                checked={settings.autoGenerateInfographic}
                onChange={(v) => saveSettings({ autoGenerateInfographic: v })}
              />
            </div>
          </div>
        </section>

        {/* ─── Section 4: Content Defaults ─── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-accent" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Content Defaults
            </h2>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
            {/* Tone */}
            <div>
              <label className="text-xs font-medium text-text-primary block mb-2">
                Default Content Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    onClick={() =>
                      saveSettings({ defaultContentTone: tone })
                    }
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors capitalize ${
                      settings.defaultContentTone === tone
                        ? "border-accent/50 bg-accent/5 text-accent"
                        : "border-border text-text-dim hover:border-border-hover hover:text-text-primary"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            {/* Word Count */}
            <div>
              <label className="text-xs font-medium text-text-primary block mb-2">
                Target Word Count
                <span className="ml-2 text-accent font-normal">
                  {settings.targetWordCount.toLocaleString()} words
                </span>
              </label>
              <input
                type="range"
                min="500"
                max="5000"
                step="250"
                value={settings.targetWordCount}
                onChange={(e) =>
                  saveSettings({
                    targetWordCount: parseInt(e.target.value),
                  })
                }
                className="w-full max-w-md accent-[#C8FF00] h-1.5 bg-surface-2 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between max-w-md mt-1">
                <span className="text-[10px] text-text-muted">500</span>
                <span className="text-[10px] text-text-muted">2,500</span>
                <span className="text-[10px] text-text-muted">5,000</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Section 5: Data Management ─── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 size={14} className="text-red-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Data Management
            </h2>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary font-medium">
                  Export Settings
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Download your current settings as a JSON file
                </p>
              </div>
              <button
                onClick={handleExportSettings}
                className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-text-primary hover:bg-surface-2 transition-colors flex items-center gap-2"
              >
                <Download size={14} />
                Export
              </button>
            </div>

            <div className="border-t border-border" />

            {/* Clear History */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary font-medium">
                  Clear Chat History
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Delete all chat messages across all projects. Projects and
                  generated content are preserved.
                </p>
              </div>
              {confirmAction === "clear-history" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDataAction("clear-history")}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? "Clearing..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="px-3 py-2 rounded-lg border border-border text-xs text-text-dim hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAction("clear-history")}
                  className="px-4 py-2 rounded-lg border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Clear
                </button>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Delete Projects */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary font-medium flex items-center gap-2">
                  Delete All Projects
                  <AlertTriangle size={14} className="text-red-400" />
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Permanently delete all projects, chat history, generated
                  content, and images. This cannot be undone.
                </p>
              </div>
              {confirmAction === "delete-projects" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDataAction("delete-projects")}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? "Deleting..." : "Yes, delete all"}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="px-3 py-2 rounded-lg border border-border text-xs text-text-dim hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAction("delete-projects")}
                  className="px-4 py-2 rounded-lg border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete All
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Toggle Switch Component ──────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-text-primary">{label}</p>
        <p className="text-[10px] text-text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-surface-2"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
            checked
              ? "translate-x-5 bg-bg"
              : "translate-x-0.5 bg-text-muted"
          }`}
        />
      </button>
    </div>
  );
}

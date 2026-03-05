"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DemoSiteButtonProps {
  onCreated?: () => void;
  variant?: "default" | "compact";
}

export function DemoSiteButton({
  onCreated,
  variant = "default",
}: DemoSiteButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mock-wp/setup", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create demo site");
        return;
      }

      toast.success("Demo site created! Redirecting...");
      onCreated?.();
      router.push(`/wordpress/${data.id}`);
    } catch {
      toast.error("Failed to create demo site");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-accent/30 text-accent font-medium text-sm hover:bg-accent/10 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FlaskConical size={16} />
        )}
        Try Demo
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-accent/30 text-accent font-medium text-sm hover:bg-accent/10 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FlaskConical size={16} />
      )}
      Try Demo Site
      <span className="text-text-dim font-normal">&mdash; No WordPress needed</span>
    </button>
  );
}

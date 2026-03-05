"use client";

interface JobStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-text-muted bg-text-muted/10" },
  analyzing: { label: "Analyzing", color: "text-info bg-info/10" },
  publishing: { label: "Publishing", color: "text-warning bg-warning/10" },
  verifying: { label: "Verifying", color: "text-info bg-info/10" },
  completed: { label: "Completed", color: "text-success bg-success/10" },
  failed: { label: "Failed", color: "text-danger bg-danger/10" },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

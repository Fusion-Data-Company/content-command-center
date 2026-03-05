"use client";

interface ConnectionBadgeProps {
  status: string;
  className?: string;
}

export function ConnectionBadge({ status, className = "" }: ConnectionBadgeProps) {
  const isConnected = status === "success";
  const isFailed = status === "failed";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected
            ? "bg-success"
            : isFailed
            ? "bg-danger"
            : "bg-text-muted"
        }`}
      />
      <span
        className={
          isConnected
            ? "text-success"
            : isFailed
            ? "text-danger"
            : "text-text-muted"
        }
      >
        {isConnected ? "Connected" : isFailed ? "Failed" : "Untested"}
      </span>
    </span>
  );
}

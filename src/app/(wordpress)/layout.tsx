"use client";

import { useState } from "react";
import { SiteSidebar } from "@/components/wordpress/site-sidebar";

export default function WordPressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      {/* Sidebar */}
      <div
        style={{ width: sidebarCollapsed ? 60 : 260 }}
        className="flex-shrink-0 transition-[width] duration-200 ease-out"
      >
        <SiteSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}

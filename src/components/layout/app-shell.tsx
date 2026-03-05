"use client";

import { useState, createContext, useContext } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { PanelResizer } from "./panel-resizer";

interface OutputPanelContextType {
  outputVisible: boolean;
  setOutputVisible: (v: boolean) => void;
  outputContent: string;
  setOutputContent: (c: string) => void;
}

export const OutputPanelContext = createContext<OutputPanelContextType>({
  outputVisible: false,
  setOutputVisible: () => {},
  outputContent: "",
  setOutputContent: () => {},
});

export function useOutputPanel() {
  return useContext(OutputPanelContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [outputVisible, setOutputVisible] = useState(false);
  const [outputContent, setOutputContent] = useState("");

  return (
    <OutputPanelContext.Provider
      value={{ outputVisible, setOutputVisible, outputContent, setOutputContent }}
    >
      <div className="h-screen flex overflow-hidden bg-bg">
        {/* Sidebar */}
        <div
          style={{ width: sidebarCollapsed ? 60 : sidebarWidth }}
          className="flex-shrink-0 transition-[width] duration-200 ease-out"
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Resizer */}
        {!sidebarCollapsed && (
          <PanelResizer
            onResize={(delta) =>
              setSidebarWidth((w) => Math.max(220, Math.min(400, w + delta)))
            }
          />
        )}

        {/* Main Workspace */}
        <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
      </div>
    </OutputPanelContext.Provider>
  );
}

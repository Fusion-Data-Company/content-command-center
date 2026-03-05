"use client";

import { useCallback, useRef } from "react";

interface PanelResizerProps {
  onResize: (deltaX: number) => void;
}

export function PanelResizer({ onResize }: PanelResizerProps) {
  const startXRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        startXRef.current = moveEvent.clientX;
        onResize(delta);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [onResize]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-[3px] cursor-col-resize bg-transparent hover:bg-accent/20 transition-colors flex-shrink-0 relative"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

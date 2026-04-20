import { useState, useRef, useCallback, type ReactNode } from "react";

interface ResizablePanelsProps {
  top: ReactNode;
  bottom: ReactNode;
  direction?: "vertical" | "horizontal";
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
}

export function ResizablePanels({
  top,
  bottom,
  direction = "vertical",
  initialRatio = 0.5,
  minRatio = 0.15,
  maxRatio = 0.85,
}: ResizablePanelsProps) {
  const [ratio, setRatio] = useState(initialRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = direction === "vertical" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio =
        direction === "vertical"
          ? (e.clientY - rect.top) / rect.height
          : (e.clientX - rect.left) / rect.width;
      setRatio(Math.max(minRatio, Math.min(maxRatio, newRatio)));
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [direction, minRatio, maxRatio]);

  const isVertical = direction === "vertical";

  return (
    <div
      ref={containerRef}
      className={`flex ${isVertical ? "flex-col" : "flex-row"} h-full w-full`}
    >
      <div style={{ [isVertical ? "height" : "width"]: `${ratio * 100}%` }} className="overflow-auto">
        {top}
      </div>
      <div
        className={`${
          isVertical ? "h-1 cursor-row-resize" : "w-1 cursor-col-resize"
        } bg-zinc-800 hover:bg-zinc-600 transition-colors flex-shrink-0`}
        onMouseDown={onMouseDown}
      />
      <div style={{ [isVertical ? "height" : "width"]: `${(1 - ratio) * 100}%` }} className="overflow-auto">
        {bottom}
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";

export interface ContextMenuAction {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[140px] bg-zinc-900 border border-zinc-700 rounded shadow-xl py-1"
      style={{ left: x, top: y }}
    >
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => {
            action.onClick();
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 ${
            action.danger ? "text-red-400" : "text-zinc-300"
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

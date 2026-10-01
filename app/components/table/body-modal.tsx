import { useEffect, type ReactNode } from "react";

interface BodyModalProps {
  /** What the body belongs to, e.g. "Trigger body". */
  kind: string;
  /** The row's name, shown in monospace after the kind. */
  name: string;
  /** A line under the title: the signature, the ON clause, and so on. */
  subtitle?: ReactNode;
  body: string;
  onClose: () => void;
}

/**
 * A row's stored body (a trigger's, a function's), opened over the table
 * instead of under it. Escape, the close button and the backdrop dismiss it.
 */
export function BodyModal({
  kind,
  name,
  subtitle,
  body,
  onClose,
}: BodyModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${kind}: ${name}`}
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-zinc-700">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-zinc-200 truncate">
              {kind}: <span className="font-mono text-zinc-300">{name}</span>
            </h2>
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap">
            {body}
          </pre>
        </div>
      </div>
    </div>
  );
}

import { useRef, useEffect, useCallback, useState } from "react";

/**
 * Cypher query editor with syntax highlighting, auto-complete,
 * multi-statement support, and keyboard shortcuts.
 *
 * Uses a textarea as a base. In production, replace with CodeMirror 6
 * via @codemirror/lang-cypher or a custom language mode.
 */

export interface CypherEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: (query: string) => void;
  onExplain?: (query: string) => void;
  onProfile?: (query: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  completionItems?: string[];
}

const CYPHER_KEYWORDS = [
  "MATCH", "OPTIONAL", "WHERE", "RETURN", "CREATE", "DELETE", "DETACH",
  "SET", "REMOVE", "MERGE", "WITH", "UNWIND", "ORDER", "BY", "SKIP",
  "LIMIT", "UNION", "ALL", "CALL", "YIELD", "AS", "DISTINCT",
  "AND", "OR", "NOT", "XOR", "IN", "IS", "NULL", "TRUE", "FALSE",
  "STARTS", "ENDS", "CONTAINS", "EXISTS", "CASE", "WHEN", "THEN",
  "ELSE", "END", "ON", "FOREACH", "ASC", "DESC", "EXPLAIN", "PROFILE",
];

export function CypherEditor({
  value,
  onChange,
  onExecute,
  onExplain,
  onProfile,
  placeholder = "Enter Cypher query...",
  readOnly = false,
  completionItems = [],
}: CypherEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionFilter, setCompletionFilter] = useState("");
  const [selectedCompletion, setSelectedCompletion] = useState(0);

  const allCompletions = [...CYPHER_KEYWORDS, ...completionItems];

  const filteredCompletions = completionFilter
    ? allCompletions.filter((item) =>
        item.toLowerCase().startsWith(completionFilter.toLowerCase()),
      ).slice(0, 10)
    : [];

  // Get the current statement at cursor (delimited by ;).
  const getCurrentStatement = useCallback((): string => {
    const textarea = textareaRef.current;
    if (!textarea) return value;

    const pos = textarea.selectionStart;
    const statements = splitStatements(value);
    let offset = 0;
    for (const stmt of statements) {
      const end = offset + stmt.length;
      if (pos <= end) return stmt.trim();
      offset = end + 1; // +1 for the semicolon
    }
    return statements[statements.length - 1]?.trim() ?? value;
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl+Enter: execute current statement.
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const stmt = getCurrentStatement();
        if (stmt) onExecute(stmt);
        return;
      }

      // Cmd/Ctrl+Shift+E: explain.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "e") {
        e.preventDefault();
        const stmt = getCurrentStatement();
        if (stmt) onExplain?.(stmt);
        return;
      }

      // Cmd/Ctrl+Shift+P: profile.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "p") {
        e.preventDefault();
        const stmt = getCurrentStatement();
        if (stmt) onProfile?.(stmt);
        return;
      }

      // Tab: accept completion.
      if (e.key === "Tab" && showCompletion && filteredCompletions.length > 0) {
        e.preventDefault();
        applyCompletion(filteredCompletions[selectedCompletion]);
        return;
      }

      // Arrow keys in completion menu.
      if (showCompletion && filteredCompletions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCompletion((prev) => Math.min(prev + 1, filteredCompletions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCompletion((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          applyCompletion(filteredCompletions[selectedCompletion]);
          return;
        }
      }

      // Escape: close completion.
      if (e.key === "Escape") {
        setShowCompletion(false);
        return;
      }
    },
    [getCurrentStatement, onExecute, onExplain, onProfile, showCompletion, filteredCompletions, selectedCompletion],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Trigger auto-complete on word boundary.
      const textarea = e.target;
      const pos = textarea.selectionStart;
      const textBefore = newValue.slice(0, pos);
      const wordMatch = textBefore.match(/(\w+)$/);
      if (wordMatch && wordMatch[1].length >= 2) {
        setCompletionFilter(wordMatch[1]);
        setShowCompletion(true);
        setSelectedCompletion(0);
      } else {
        setShowCompletion(false);
      }
    },
    [onChange],
  );

  const applyCompletion = useCallback(
    (item: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const pos = textarea.selectionStart;
      const textBefore = value.slice(0, pos);
      const wordMatch = textBefore.match(/(\w+)$/);
      if (wordMatch) {
        const start = pos - wordMatch[1].length;
        const newValue = value.slice(0, start) + item + " " + value.slice(pos);
        onChange(newValue);
      }
      setShowCompletion(false);
    },
    [value, onChange],
  );

  return (
    <div className="relative flex flex-col h-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        placeholder={placeholder}
        spellCheck={false}
        className="flex-1 w-full p-4 bg-zinc-950 text-zinc-100 font-mono text-sm leading-relaxed resize-none focus:outline-none border-none"
        style={{ tabSize: 2 }}
      />

      {/* Auto-completion dropdown */}
      {showCompletion && filteredCompletions.length > 0 && (
        <div className="absolute left-4 top-8 z-10 bg-zinc-800 border border-zinc-700 rounded shadow-lg max-h-48 overflow-y-auto">
          {filteredCompletions.map((item, i) => (
            <div
              key={item}
              className={`px-3 py-1 text-xs font-mono cursor-pointer ${
                i === selectedCompletion
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-700/50"
              }`}
              onMouseDown={() => applyCompletion(item)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Split a Cypher script into individual statements by semicolons. */
export function splitStatements(script: string): string[] {
  return script
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

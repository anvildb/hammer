import { useState, useEffect, useCallback } from "react";
import type {
  ApiClient,
  AppEmailTemplate,
  AppEmailPreview,
} from "~/lib/api-client";

interface Props {
  client: ApiClient;
  appId: string;
}

const VARIABLES: Record<string, string[]> = {
  verification: ["{{verification_link}}", "{{verification_code}}", "{{token}}"],
  otp: ["{{otp_code}}", "{{ttl_minutes}}"],
  password_reset: ["{{reset_link}}", "{{token}}"],
};
const COMMON_VARIABLES = ["{{app_name}}", "{{app_slug}}", "{{app_id}}"];

/**
 * Per-app email templates (APPS.md Phase 3): override subject / html / text
 * for verification, OTP, and password-reset mails, with a live preview.
 */
export function AppEmailTemplates({ client, appId }: Props) {
  const [templates, setTemplates] = useState<AppEmailTemplate[]>([]);
  const [selected, setSelected] = useState<string>("verification");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<AppEmailPreview | null>(null);
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setTemplates(await client.listAppEmailTemplates(appId));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [client, appId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const current = templates.find((t) => t.name === selected) ?? null;

  // Load the editor from the selected template whenever it changes on the server.
  useEffect(() => {
    if (!current) return;
    setSubject(current.subject);
    setHtml(current.html);
    setText(current.text);
    setDirty(false);
    setPreview(null);
  }, [current]);

  async function save() {
    setBusy(true);
    try {
      const saved = await client.putAppEmailTemplate(appId, selected, {
        subject,
        html,
        text,
      });
      setTemplates((prev) =>
        prev.map((t) => (t.name === saved.name ? saved : t)),
      );
      setDirty(false);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetToDefault() {
    setBusy(true);
    try {
      const restored = await client.deleteAppEmailTemplate(appId, selected);
      setTemplates((prev) =>
        prev.map((t) => (t.name === restored.name ? restored : t)),
      );
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    setBusy(true);
    try {
      // Preview renders what is saved on the server; save first if dirty.
      if (dirty) await save();
      setPreview(await client.previewAppEmailTemplate(appId, selected));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Template list */}
      <div className="w-52 shrink-0 border-r border-zinc-800">
        {templates.map((t) => (
          <button
            key={t.name}
            onClick={() => setSelected(t.name)}
            className={`block w-full text-left px-3 py-2 text-xs transition-colors ${
              selected === t.name
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800/40"
            }`}
          >
            <span className="font-mono">{t.name}</span>
            {t.custom && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">
                custom
              </span>
            )}
          </button>
        ))}
        {templates.length === 0 && (
          <p className="px-3 py-4 text-xs text-zinc-500">Loading...</p>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0 p-4 space-y-3 overflow-y-auto">
        {error && (
          <div className="p-2 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs break-words">
            {error}
          </div>
        )}

        <p className="text-xs text-zinc-500">
          Variables:{" "}
          {[...(VARIABLES[selected] ?? []), ...COMMON_VARIABLES].map((v) => (
            <span key={v} className="font-mono mr-2 text-zinc-400">
              {v}
            </span>
          ))}
        </p>

        <div>
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setDirty(true);
            }}
            className="w-full bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
            HTML body
          </label>
          <textarea
            value={html}
            onChange={(e) => {
              setHtml(e.target.value);
              setDirty(true);
            }}
            rows={12}
            spellCheck={false}
            className="w-full bg-zinc-800 text-zinc-200 text-xs font-mono rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
            Text body
          </label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDirty(true);
            }}
            rows={6}
            spellCheck={false}
            className="w-full bg-zinc-800 text-zinc-200 text-xs font-mono rounded px-2 py-1 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={busy || !dirty}
            onClick={save}
            className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
          >
            Save
          </button>
          <button
            disabled={busy}
            onClick={runPreview}
            className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            {dirty ? "Save & preview" : "Preview"}
          </button>
          {current?.custom && (
            <button
              disabled={busy}
              onClick={resetToDefault}
              className="ml-auto text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-red-300 disabled:opacity-50"
            >
              Reset to server default
            </button>
          )}
        </div>

        {preview && (
          <div className="rounded-md border border-zinc-800">
            <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-800 bg-zinc-900">
              <span className="text-xs text-zinc-500">Preview</span>
              <span className="text-xs text-zinc-200 truncate">
                {preview.subject}
              </span>
              <div className="ml-auto flex gap-1">
                {(["html", "text"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPreviewMode(m)}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      previewMode === m
                        ? "bg-zinc-700 text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {previewMode === "html" ? (
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={preview.html}
                className="w-full h-96 bg-white rounded-b-md"
              />
            ) : (
              <pre className="p-3 text-xs text-zinc-300 whitespace-pre-wrap">
                {preview.text}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

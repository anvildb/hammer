import { useState } from "react";
import { useConnection } from "~/lib/connection-context";
import { normalizeServerUrl } from "~/lib/saved-servers";

type AuthTab = "password" | "email";
type OtpStep = "request" | "verify";

export function LoginScreen() {
  const { login, otpRequest, otpVerify, resendVerification, status } = useConnection();
  const [tab, setTab] = useState<AuthTab>("password");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // OTP fields
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("request");
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      const msg = String(err);
      setError(msg);
      // Show resend verification option if email not verified
      if (msg.toLowerCase().includes("email not verified")) {
        setInfo("Check your email for the verification link, or resend below.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await otpRequest(email);
      setOtpStep("verify");
      setOtpExpiresIn(result.expires_in_seconds);
      setInfo(`Code sent to ${email}. It expires in ${Math.ceil(result.expires_in_seconds / 60)} minutes.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !otpCode.trim()) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await otpVerify(email, otpCode);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email.trim() && !username.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const target = email.trim() || username.trim();
      const result = await resendVerification(target);
      setInfo(result.message);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">Anvil DB</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to continue</p>
          {status === "disconnected" && (
            <p className="text-yellow-500 text-xs mt-2">Server not reachable</p>
          )}
        </div>

        <ServerPicker />

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-800 mb-0">
          <button
            onClick={() => { setTab("password"); setError(null); setInfo(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
              tab === "password" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Password
            {tab === "password" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
          </button>
          <button
            onClick={() => { setTab("email"); setError(null); setInfo(null); setOtpStep("request"); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
              tab === "email" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Email Code
            {tab === "email" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 border-t-0 rounded-b-lg p-6 space-y-4">
          {/* Password login */}
          {tab === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-xs text-zinc-400 mb-1">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  placeholder="admin"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs text-zinc-400 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  placeholder="password"
                />
              </div>
              <button
                type="submit"
                disabled={loading || status !== "connected" || !username.trim() || !password.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {/* OTP login */}
          {tab === "email" && otpStep === "request" && (
            <form onSubmit={handleOtpRequest} className="space-y-4">
              <div>
                <label htmlFor="otp-email" className="block text-xs text-zinc-400 mb-1">Email address</label>
                <input
                  id="otp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="email"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading || status !== "connected" || !email.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors"
              >
                {loading ? "Sending..." : "Send Login Code"}
              </button>
            </form>
          )}

          {tab === "email" && otpStep === "verify" && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <p className="text-xs text-zinc-400">
                Enter the 6-digit code sent to <span className="text-zinc-200">{email}</span>
              </p>
              <div>
                <label htmlFor="otp-code" className="block text-xs text-zinc-400 mb-1">Code</label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:border-blue-500"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={loading || status !== "connected" || otpCode.length !== 6}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setOtpStep("request"); setOtpCode(""); setError(null); setInfo(null); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    try {
                      const result = await otpRequest(email);
                      setInfo(`New code sent. Expires in ${Math.ceil(result.expires_in_seconds / 60)} min.`);
                      setOtpCode("");
                    } catch (err) {
                      setError(String(err));
                    }
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {/* Error / info messages */}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          {info && <p className="text-blue-400 text-xs">{info}</p>}

          {/* Resend verification (shown when login fails due to unverified email) */}
          {error?.toLowerCase().includes("email not verified") && (
            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-zinc-700 rounded transition-colors"
            >
              Resend verification email
            </button>
          )}
        </div>

        {tab === "password" && (
          <p className="text-center text-zinc-600 text-xs mt-4">
            Default: admin / anvil
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Pre-auth server selection, shown only when the Hammer instance was started
 * with VITE_ANVIL_ALLOW_SERVER_ADD. Visitors can point this instance at
 * another Anvil server before logging in; the server is remembered by this
 * browser only after a login against it succeeds.
 */
function ServerPicker() {
  const { allowServerAdd, baseUrl, defaultServerUrl, savedServers, selectServer, removeSavedServer, status } =
    useConnection();
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  if (!allowServerAdd) return null;

  const listed = savedServers.filter((s) => s.url !== defaultServerUrl);
  // A server just added this session but not yet remembered (no login yet).
  const unlisted = baseUrl !== defaultServerUrl && !listed.some((s) => s.url === baseUrl);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    try {
      const url = normalizeServerUrl(newUrl);
      selectServer(url, newName.trim() || undefined);
      setAdding(false);
      setNewUrl("");
      setNewName("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="server-select" className="block text-xs text-zinc-400">
          Server
        </label>
        <button
          type="button"
          onClick={() => { setAdding(!adding); setAddError(null); }}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {adding ? "Cancel" : "+ Add server"}
        </button>
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="space-y-2 bg-zinc-900 border border-zinc-800 rounded p-3">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            autoFocus
            placeholder="https://db.example.com:7474"
            aria-label="Server URL"
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (optional)"
            aria-label="Server name"
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
          />
          {addError && <p className="text-red-400 text-xs">{addError}</p>}
          <button
            type="submit"
            disabled={!newUrl.trim()}
            className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 text-xs font-medium rounded transition-colors"
          >
            Use this server
          </button>
          <p className="text-[11px] text-zinc-600">
            Remembered on this browser after a successful sign-in.
          </p>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <select
            id="server-select"
            value={baseUrl}
            onChange={(e) => selectServer(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
          >
            <option value={defaultServerUrl}>Default ({defaultServerUrl})</option>
            {listed.map((s) => (
              <option key={s.id} value={s.url}>
                {s.name} ({s.url})
              </option>
            ))}
            {unlisted && <option value={baseUrl}>{baseUrl}</option>}
          </select>
          <span
            title={status === "connected" ? "Server reachable" : status === "connecting" ? "Checking..." : "Server not reachable"}
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
              status === "connected" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-red-500"
            }`}
          />
        </div>
      )}

      {!adding && listed.some((s) => s.url === baseUrl) && (
        <button
          type="button"
          onClick={() => {
            const current = listed.find((s) => s.url === baseUrl);
            if (current) {
              removeSavedServer(current.id);
              selectServer(defaultServerUrl);
            }
          }}
          className="text-[11px] text-zinc-600 hover:text-red-400 mt-1"
        >
          Forget this server
        </button>
      )}
    </div>
  );
}

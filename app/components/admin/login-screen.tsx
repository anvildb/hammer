import { useState } from "react";

interface LoginScreenProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  error?: string;
  loading?: boolean;
}

export function LoginScreen({ onLogin, error, loading }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    onLogin(username, password, rememberMe);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="w-80">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-zinc-100 font-mono">Anvil DB</h1>
          <p className="text-xs text-zinc-500 mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full bg-zinc-900 text-zinc-200 text-sm rounded px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-zinc-900 text-zinc-200 text-sm rounded px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-zinc-400"
            />
            <label htmlFor="remember" className="text-xs text-zinc-400 select-none">
              Remember me
            </label>
          </div>

          {error && (
            <div className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full text-sm px-3 py-2 rounded bg-zinc-200 text-zinc-900 font-medium hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

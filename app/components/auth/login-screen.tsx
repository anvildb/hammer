import { useState } from "react";
import { useConnection } from "~/lib/connection-context";

export function LoginScreen() {
  const { login, status } = useConnection();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
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

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs text-zinc-400 mb-1">
              Username
            </label>
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
            <label htmlFor="password" className="block text-xs text-zinc-400 mb-1">
              Password
            </label>
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

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || status !== "connected" || !username.trim() || !password.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-4">
          Default: admin / anvil
        </p>
      </div>
    </div>
  );
}

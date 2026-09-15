import type { Config } from "@react-router/dev/config";

export default {
  // Web deploys are server-rendered. Tauri desktop builds are SPA (the
  // Tauri CLI exports TAURI_ENV_PLATFORM for its build hooks), producing a
  // static build/client the webview can serve.
  ssr: process.env.TAURI_ENV_PLATFORM === undefined,
} satisfies Config;

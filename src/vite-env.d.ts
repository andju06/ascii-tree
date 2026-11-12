/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the gifts API (Cloudflare Worker). Empty means browser-only storage. */
  readonly VITE_GIFT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

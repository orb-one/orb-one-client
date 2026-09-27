/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
  readonly VITE_ENABLE_MSW?: string
  readonly VITE_MSW_USER_ID?: string
  readonly VITE_MSW_USER_EMAIL?: string
  readonly VITE_MSW_USER_NICKNAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

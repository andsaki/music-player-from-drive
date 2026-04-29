/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTION_SYNC_PAGE_ID?: string;
  readonly VITE_NOTION_SYNC_SECTION_PREFIX?: string;
  readonly VITE_SYNC_WEBSOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

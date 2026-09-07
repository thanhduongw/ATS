/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Mac dinh "/api" (same-origin qua nginx). Chi dat khi SPA chay tach entrypoint. */
    readonly VITE_API_BASE_URL?: string;
    /** Origin cua SockJS endpoint; mac dinh la window.location.origin. */
    readonly VITE_NOTIFICATION_WS_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

/**
 * Mac dinh same-origin: SPA duoc nginx phuc vu tren cung entrypoint voi /api va /ws,
 * nen khong con hardcode port downstream (8080/8081/8086) vao bundle.
 *
 * Cac bien VITE_* chi can khi chay SPA tach roi entrypoint do; `npm run dev` da co
 * proxy trong vite.config.ts nen thuong khong can dat gi ca.
 */
export const API_BASE_URL = stripTrailingSlashes(
    import.meta.env.VITE_API_BASE_URL || "/api"
);

const WS_ORIGIN = stripTrailingSlashes(
    import.meta.env.VITE_NOTIFICATION_WS_URL ||
    (typeof window === "undefined" ? "" : window.location.origin)
);

/** SockJS endpoint cua notification-service, di qua nginx -> api-gateway. */
export const NOTIFICATION_WS_URL = `${WS_ORIGIN}/ws`;

/** Buoc mo dau Google SSO; auth-service se redirect tiep sang /api/auth/oauth2/authorization/google. */
export const OAUTH2_PRE_LOGIN_URL = `${API_BASE_URL}/auth/oauth2/pre-login`;

/**
 * API base URL for axios and direct fetch calls.
 * - IIS/production: same origin as the page (avoids localhost vs 127.0.0.1 CORS).
 * - Dev: REACT_APP_BACKEND_URL (uvicorn on :8000) when set.
 */
export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const configured = process.env.REACT_APP_BACKEND_URL;
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev) {
      return window.location.origin;
    }

    if (configured) {
      try {
        const configuredOrigin = new URL(configured).origin;
        if (configuredOrigin !== window.location.origin) {
          return configuredOrigin;
        }
      } catch {
        return configured.replace(/\/$/, "");
      }
    }

    return window.location.origin;
  }

  return (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
}

export function getApiUrl() {
  const base = getApiBaseUrl();
  return base ? `${base}/api` : "/api";
}

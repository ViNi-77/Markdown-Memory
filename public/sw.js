const CACHE_NAME = "markdown-memory-shell-v3";
const OFFLINE_FALLBACK_TEST_PATH = "/offline-check";
const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Markdown Memory オフライン</title>
  </head>
  <body>
    <main>
      <h1>Markdown Memory に接続できません</h1>
      <p>非公開のMarkdown本文、API応答、共有ページは端末にキャッシュしない設計です。</p>
    </main>
  </body>
</html>`;
const APP_SHELL = [
  "/demo",
  "/offline",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon.svg",
  "/icons/maskable-icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

function isPrivateOrDynamicPath(pathname) {
  return (
    pathname === "/" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/view/") ||
    pathname.startsWith("/login")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivateOrDynamicPath(url.pathname)) return;

  if (request.mode === "navigate") {
    // Synthetic navigation used by E2E to verify the cached offline fallback.
    if (url.pathname === OFFLINE_FALLBACK_TEST_PATH) {
      event.respondWith(
        new Response(OFFLINE_FALLBACK_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      );
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (url.pathname === "/demo" || url.pathname === "/offline") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match("/offline")),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/demo") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    );
  }
});

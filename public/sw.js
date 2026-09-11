const CACHE_NAME = "study26-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/",
        "/manifest.webmanifest",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/icons/apple-touch-icon.png",
      ])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/student/") ||
    url.pathname.startsWith("/teacher/") ||
    url.pathname.startsWith("/admin/") ||
    url.pathname.startsWith("/profile")
  ) {
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
            return response;
          })
        );
      })
    );
  }
});

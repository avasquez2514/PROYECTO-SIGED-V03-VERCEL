const SW_VERSION = "siged-sw-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through network fetch so API calls and sessions are always fresh,
  // while satisfying browser PWA installability requirements.
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});

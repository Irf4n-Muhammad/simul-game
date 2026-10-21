// Minimal service worker: makes the page installable as an app. It caches nothing,
// every request goes to the network, so a new push to main is picked up on the next open.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => { e.respondWith(fetch(e.request)); });

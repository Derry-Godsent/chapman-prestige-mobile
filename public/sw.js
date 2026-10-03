// A service worker that stays out of the way.
//
// Chrome and Edge only offer the real "Install app" experience, with the app in
// its own window and the icon on the dock or home screen, when the site has one of
// these with a fetch handler. This one does nothing else: it never caches
// anything, and every request goes straight to the network, so a redeploy can
// never leave a phone holding an old copy of the app.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Left to the network, on purpose.
});

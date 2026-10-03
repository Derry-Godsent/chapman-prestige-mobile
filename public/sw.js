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

self.addEventListener("fetch", (event) => {
  // Pages are always fetched fresh.
  //
  // In a browser tab this changes nothing. Added to a phone's home screen it does:
  // the phone likes to hand back the page it downloaded the day the icon was
  // added, and a page from last week draws an app from last week. Asking the
  // network every time is what keeps the newest work in front of the customer.
  //
  // Assets have a name that changes with their contents, so they are unaffected.
  // Nothing is cached here, so the app needs a connection, which it always did.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
  }
});

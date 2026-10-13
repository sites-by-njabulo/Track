const CACHE_NAME = "track-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/config.js",
  "./js/verses.js",
  "./js/sync.js",
  "./js/derive.js",
  "./js/ui.js",
  "./js/tasks.js",
  "./js/content.js",
  "./js/weekplan.js",
  "./js/goals.js",
  "./js/stand.js",
  "./js/today.js",
  "./js/checkin.js",
  "./js/review.js",
  "./js/settings.js",
  "./js/boot.js",
  "./icons/icon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/logo-mark.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      // addAll rejects the whole install if ANY asset 404s. Cache what we can.
      .then(function (c) { return Promise.allSettled(STATIC_ASSETS.map(function (a) { return c.add(a); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; })
                               .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// NETWORK-FIRST. Cache-first served a stale app.js after every deploy in
// MyDay. Always try the network, fall back to cache only when offline.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Never cache Supabase: its responses are the live data.
  if (url.hostname.indexOf("supabase") !== -1) return;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      })
      .catch(function () { return caches.match(event.request); })
  );
});

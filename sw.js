var CACHE = "study-abroad-trips-v1";
var SHELL = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "fonts/fraunces-500-latin.woff2",
  "data/trips.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fromNetworkThenCache(event.request));
});

async function fromNetworkThenCache(request) {
  var cache = await caches.open(CACHE);
  try {
    var res = await fetch(request);
    if (res && res.ok && res.type === "basic") {
      await cache.put(request, res.clone());
    }
    if (res && res.ok) return res;
    var stale = await cache.match(request);
    if (stale) return stale;
    if (request.mode === "navigate") {
      var shell = await cache.match("index.html");
      if (shell) return shell;
    }
    return res;
  } catch (err) {
    var cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      var home = await cache.match("index.html");
      if (home) return home;
    }
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

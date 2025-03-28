const CACHE_NAME = "cms-cache-v1";
const urlsToCache = [
  "/CMS-web-app-for-uni/",
  "/CMS-web-app-for-uni/service-worker.js",
  "/CMS-web-app-for-uni/index.html",
  "/CMS-web-app-for-uni/styles.css",
  "/CMS-web-app-for-uni/script.js",
  "/CMS-web-app-for-uni/dashboard.html",
  "/CMS-web-app-for-uni/messages.html",
  "/CMS-web-app-for-uni/tasks.html",
  "/CMS-web-app-for-uni/icons/icon-192x192.png",
  "/CMS-web-app-for-uni/icons/icon-512x512.png",
  "https://fonts.googleapis.com/icon?family=Material+Icons"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

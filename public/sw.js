// Minimal service worker so Daily Dose can be installed (Add to Home Screen)
// and used as an Android share target. It doesn't cache anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

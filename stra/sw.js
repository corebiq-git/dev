// COREBIQ STRACARE offline shell - network-first for live application code.
const CACHE = "corebiq-v78";
const CORE = [
    "./", "./index.html", "./login.html",
    "./components/splash-screen.html", "./components/header.html", "./js/index.js", "./manifest.webmanifest",
    "./assets/app-icon.png", "./assets/header-square-logo.svg", "./assets/logo-client.png",
    "./assets/logo-client-display.png", "./assets/document-logo.webp",
    "./assets/name-client-display.png", "./assets/logo.png",
    "./assets/card-bg1.webp", "./assets/card-bg2.webp",
    "./assets/card-bg3.webp", "./assets/card-bg4.webp",
    "./assets/card-bg5.webp", "./assets/header-brand.png",
    "./assets/sidebar-brand.webp", "./assets/poweredby.png", "./assets/corebiq-footer-blue.webp", "./components/sidebar.html",
    "./assets/name.png", "./css/index.css", "./css/corebiq.css",
    "./css/care-theme.css", "./css/week-calendar.css",
    "./css/sign-in.css", "./css/care-loader.css",
    "./js/care-loader.js", "./assets/trefoil-loader.svg",
    "./assets/biq-ai-logo.svg", "./js/sign-in.js",
    "./js/care-access.js", "./js/indian-phone.mjs",
    "./css/module-page.css", "./css/care-dialogs.css",
    "./js/care-dialogs.js", "./js/module-page.mjs",
    "./components/form-view.css", "./js/firebase-config.js",
    "./js/corebiq-locale.js", "./js/app-metadata.js",
    "./js/patient-search.mjs",
    "./modules/crm/appointments/appointments.html", "./modules/crm/appointments/appointments.css", "./modules/crm/appointments/appointments.js",
    "./modules/templates/template-invoice/template-invoice.html",
    "./modules/templates/template-invoice/template-invoice.css",
    "./modules/templates/template-invoice/template-invoice.js",
    "./modules/templates/template-invoice/template-invoice-2.js"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE).then(cache =>
            Promise.allSettled(CORE.map(path => cache.add(path)))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys
                .filter(key => key.startsWith("corebiq-v") && key !== CACHE)
                .map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // HTML, JavaScript, CSS and JSON are network-first, preventing stale
    // deployments and mismatched bundles. Cache serves offline fallback only.
    const liveCode = request.mode === "navigate" ||
        /\.(?:html?|m?js|css|json|webmanifest)$/i.test(url.pathname);
    if (liveCode) {
        event.respondWith(
            fetch(request, {cache:"no-cache"}).then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
                }
                return response;
            }).catch(async () => {
                const cached = await caches.match(request);
                return cached || Response.error();
            })
        );
        return;
    }

    // Versioned/visual assets can load from cache for quick repeat visits.
    event.respondWith(
        caches.match(request).then(cached => cached || fetch(request).then(response => {
            if (response.ok) {
                const copy = response.clone();
                event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
            }
            return response;
        }))
    );
});

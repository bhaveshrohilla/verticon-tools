const CACHE_NAME = 'verticon-tools-v2'; // Incremented version

const FALLBACK_ASSETS = [
    '/',
    'index.html',
    'home',
    'manifest.json',
    'favicon.ico',
    'src/commonstyles.css',
    'src/commonscript.js',
    'src/css/landing.css',
    'src/css/tools_home.css',
    'src/js/tools_home.js',
    'src/images/128-128.png',
    'src/images/512-512.png',
    'pdf-compress',
    'src/css/pdf-compress.css',
    'src/js/pdf-compress.js',
    'pdf-merge',
    'src/css/pdf-merge.css',
    'src/js/pdf-merge.js',
    'pdf-rearrange',
    'src/css/pdf-rearrange.css',
    'src/js/pdf-rearrange.js',
    'pdf-rotate',
    'src/css/pdf-rotate.css',
    'src/js/pdf-rotate.js',
    'pdf-split',
    'src/css/pdf-split.css',
    'src/js/pdf-split.js',
    'pdf-to-image',
    'src/css/pdf-to-image.css',
    'src/js/pdf-to-image.js',
    'img-compress',
    'src/css/img-compress.css',
    'src/js/img-compress.js',
    'img-convert',
    'src/css/img-convert.css',
    'src/js/img-convert.js',
    'img-resize',
    'src/css/img-resize.css',
    'src/js/img-resize.js',
    'img-to-pdf',
    'src/css/img-to-pdf.css',
    'src/js/img-to-pdf.js',
    'privacy',
    'terms',
    'idf-platform',
    'img_exif',
    'src/css/img-exif.css',
    'src/js/img-exif.js',
    'src/js/img_to_pdf.js' 
];

const EXTERNAL_LIBS = [
    new Request('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', { mode: 'cors' }),
    new Request('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js', { mode: 'cors' }),
    new Request('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js', { mode: 'cors' }),
    new Request('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', { mode: 'cors' }),
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // We use map + reflect to ensure one failing URL doesn't break the whole install
            const allAssets = [...FALLBACK_ASSETS, ...EXTERNAL_LIBS];
            return Promise.allSettled(
                allAssets.map(asset => cache.add(asset))
            );
        })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) return response;

            return fetch(event.request).then((networkResponse) => {
                // Check if valid response
                if (!networkResponse || networkResponse.status !== 200) return networkResponse;

                // Cache local files AND CORS-enabled CDN files
                if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }

                return networkResponse;
            }).catch(() => {
                if (event.request.mode === 'navigate') return caches.match('index.html');
            });
        })
    );

});

/* file: sw.js */
const CACHE_NAME = 'verticon-tools-v2';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; 
const MAX_OFFLINE_DAYS = 14 * 24 * 60 * 60 * 1000; 
const CACHE_METADATA_KEY = 'cache-metadata';
const CACHE_EXPIRED_HTML = 'cache_expired';

const FALLBACK_ASSETS = [
    '/', 'index.html', 'home', 'manifest.json', 'favicon.ico', 'cache_expired',
    'src/commonstyles.css', 'src/commonscript.js', 'src/css/landing.css',
    'src/css/tools_home.css', 'src/js/tools_home.js', 'src/images/128-128.png',
    'src/images/512-512.png', 'pdf-compress', 'src/css/pdf-compress.css',
    'src/js/pdf-compress.js', 'pdf-merge', 'src/css/pdf-merge.css',
    'src/js/pdf-merge.js', 'pdf-rearrange', 'src/css/pdf-rearrange.css',
    'src/js/pdf-rearrange.js', 'pdf-rotate', 'src/css/pdf-rotate.css',
    'src/js/pdf-rotate.js', 'pdf-split', 'src/css/pdf-split.css',
    'src/js/pdf-split.js', 'pdf-to-image', 'src/css/pdf-to-image.css',
    'src/js/pdf-to-image.js', 'img-compress', 'src/css/img-compress.css',
    'src/js/img-compress.js', 'img-convert', 'src/css/img-convert.css',
    'src/js/img-convert.js', 'img-resize', 'src/css/img-resize.css',
    'src/js/img-resize.js', 'img-to-pdf', 'src/css/img-to-pdf.css',
    'src/js/img-to-pdf.js', 'privacy', 'terms', 'idf-platform', 'img_exif',
    'src/css/img-exif.css', 'src/js/img-exif.js'
];

const EXTERNAL_LIBS = [
    new Request('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', { mode: 'cors' }),
    new Request('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js', { mode: 'cors' }),
    new Request('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js', { mode: 'cors' }),
    new Request('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', { mode: 'cors' }),
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VerticonToolsDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore('cache-metadata');
    });
}

async function getMetadata() {
    const db = await openDB();
    return new Promise(res => {
        const req = db.transaction('cache-metadata').objectStore('cache-metadata').get(CACHE_METADATA_KEY);
        req.onsuccess = () => res(req.result || {});
    });
}

async function setMetadata(data) {
    const db = await openDB();
    db.transaction('cache-metadata', 'readwrite').objectStore('cache-metadata').put(data, CACHE_METADATA_KEY);
}

async function recacheAll() {
    const cache = await caches.open(CACHE_NAME);
    const all = [...FALLBACK_ASSETS, ...EXTERNAL_LIBS];
    await Promise.allSettled(all.map(a => cache.add(a)));
    const meta = await getMetadata();
    all.forEach(a => meta[typeof a === 'string' ? a : a.url] = Date.now());
    await setMetadata(meta);
}

self.addEventListener('install', e => { e.waitUntil(recacheAll()); self.skipWaiting(); });

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))));
    return self.clients.claim();
});

self.addEventListener('message', e => {
    if (e.data?.type === 'RECACHE_ALL') e.waitUntil(recacheAll());
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(async res => {
        const meta = await getMetadata();
        const ts = meta[e.request.url];
        if (res && (Date.now() - ts < CACHE_EXPIRY)) return res;

        return fetch(e.request).then(net => {
            if (net.status === 200) {
                const clone = net.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                meta[e.request.url] = Date.now();
                setMetadata(meta);
            }
            return net;
        }).catch(() => res || (e.request.mode === 'navigate' ? caches.match('index.html') : null));
    }));
});

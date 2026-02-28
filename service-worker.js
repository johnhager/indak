const CACHE_NAME = 'indak-v1';
const AUDIO_CACHE_NAME = 'indak-audio-v1';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/main.js',
    '/install-prompt.js',
    '/data/vocabulary.json',
    '/assets/images/tropical_night_bg.png',
    '/assets/audio/beat_normal.wav',
    '/assets/audio/beat_stress.wav',
    '/assets/audio/beat_fail.wav',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Cache-First Strategy for Audio Assets (Hiligaynon syllables & Vocals)
    if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav') || url.pathname.endsWith('.webm') || url.pathname.includes('/audio/')) {
        event.respondWith(
            caches.open(AUDIO_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Stale-While-Revalidate for other assets
    event.respondWith(
        caches.match(event.request).then((response) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            });
            return response || fetchPromise;
        })
    );
});

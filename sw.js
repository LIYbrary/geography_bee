// Offline cache: serve cached files, refresh them in the background.
const CACHE='geography-bee-v5';
const FILES=['./','index.html','manifest.webmanifest','privacy.html','app.js','countries.js','data.js','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(e.request);const net=fetch(e.request).then(r=>{if(r.ok&&[location.origin,'https://flagcdn.com'].includes(new URL(e.request.url).origin))c.put(e.request,r.clone());return r}).catch(()=>hit);return hit||net}))});

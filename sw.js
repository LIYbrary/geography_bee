// Our own files: network first, so updates show at once; saved copy when offline or slow.
// Flag images: saved copy first, as they never change.
const CACHE='geography-bee-v11';
const FILES=['./','index.html','manifest.webmanifest','privacy.html','app.js?v=8','support.js','countries.js','data.js','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png'];
const FLAGS='https://flagcdn.com';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const old=(await caches.keys()).filter(k=>k.startsWith('geography-bee-')&&k!==CACHE);
  await Promise.all(old.map(k=>caches.delete(k)));
  await self.clients.claim();
  // v1-v6 pages cannot refresh themselves, so refresh them once. Not awaited: navigation waits for activation.
  if(old.some(k=>/-v[1-6]$/.test(k)))for(const w of await self.clients.matchAll({type:'window'}))w.navigate(w.url).catch(()=>{});
})()));
self.addEventListener('fetch',e=>{
  const req=e.request,origin=new URL(req.url).origin,own=origin===location.origin;
  if(req.method!=='GET'||!(own||origin===FLAGS))return;
  const cache=caches.open(CACHE);
  const saved=cache.then(c=>c.match(req,{ignoreSearch:req.mode==='navigate'}));
  const load=()=>fetch(own?req.url:req,own?{cache:'no-cache'}:{}).then(async r=>{if(r.ok)await (await cache).put(req,r.clone());return r});
  if(!own){e.respondWith(saved.then(hit=>hit||load()));return}
  const net=load();
  e.waitUntil(net.catch(()=>{}));
  e.respondWith((async()=>{
    const slow=new Promise(r=>setTimeout(r,3000));
    try{const r=await Promise.race([net,slow]);if(r&&r.status<500)return r}catch{}
    return (await saved)||net;
  })());
});

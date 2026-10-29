const V='stargaze-v2';
const CORE=['./','index.html','style.css','app.js','sky.js','tonight.js','facts.js','data.js','manifest.webmanifest','lib/astronomy.browser.min.js','lib/satellite.min.js','lib/model-viewer.min.js','icons/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return; // live data goes to network
  e.respondWith(caches.match(e.request).then(r=>{const net=fetch(e.request).then(res=>{if(res.ok){const cl=res.clone();caches.open(V).then(c=>c.put(e.request,cl))}return res});return r||net}))});

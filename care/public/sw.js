const CACHE='corebiq-care-shell-v2';
const SHELL=['/','/icon.svg','/manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return; // strict same-origin boundary
  if(url.pathname.startsWith('/api/')||url.pathname.includes('/__/')||
    url.pathname.endsWith('.pdf')||url.pathname.startsWith('/patient-files/'))return;
  // Network first, no dynamic response caching. Only public static shell is cached.
  event.respondWith(fetch(req).catch(()=>req.mode==='navigate'?caches.match('/'):Response.error()));
});

const C="hb-v2",SHELL=["./","index.html","app.js?v=2","style.css?v=2","manifest.json","icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith("hb-")&&n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const u=e.request.url;if(e.request.method!=="GET")return;
 // models are cached by WebLLM/wllama themselves (Cache API / OPFS); cache app shell + CDN libs here
 if(/huggingface|hf\.co|raw\.githubusercontent/.test(u))return;
 if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&(u.startsWith(self.location.origin)||/esm\.run|jsdelivr/.test(u))){const cl=res.clone();caches.open(C).then(c=>c.put(e.request,cl))}return res})))});

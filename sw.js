const C="hb-v1",SHELL=["./","index.html","app.js","manifest.json","icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{const u=e.request.url;if(e.request.method!=="GET")return;
 // models are cached by WebLLM/wllama themselves (Cache API / OPFS); cache app shell + CDN libs here
 if(/huggingface|hf\.co|raw\.githubusercontent/.test(u))return;
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&(u.startsWith(self.location.origin)||/esm\.run|jsdelivr/.test(u))){const cl=res.clone();caches.open(C).then(c=>c.put(e.request,cl))}return res})))});

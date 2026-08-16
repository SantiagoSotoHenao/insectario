/* Service worker · Bacterias · Bioaumento
   Guarda una copia de la app para que abra sin señal.
   IMPORTANTE: al cambiar la app hay que subir VERSION, si no los celulares
   siguen viendo la copia vieja. */
var VERSION = "2026-08-14.1";
var CACHE   = "bacterias-" + VERSION;
var ARCHIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ARCHIVOS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){
        if(k !== CACHE) return caches.delete(k);   // borra las copias viejas
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;

  /* NO tocar los envíos a Google: son POST y deben salir directo a la red.
     Si el service worker se metiera aquí, rompería la subida al Sheet. */
  if(req.method !== "GET") return;
  if(new URL(req.url).origin !== location.origin) return;

  /* Al abrir la app: primero la red (para traer cambios), y si no hay señal,
     la copia guardada. Así nunca queda en blanco. */
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(r){
        var copia = r.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copia); });
        return r;
      }).catch(function(){
        return caches.match("./index.html").then(function(r){
          return r || caches.match("./");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(r){
        if(r && r.status === 200){
          var copia = r.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return r;
      });
    })
  );
});

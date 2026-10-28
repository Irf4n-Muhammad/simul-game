// Minimal service worker: makes the page installable as an app. It caches nothing,
// every request goes to the network, so a new push to main is picked up on the next open.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => { e.respondWith(fetch(e.request)); });

// v48: notifikasi. Halaman (ui/38b-kabar.js) mengirim antrian { ts, tag, title, body } tiap kali dibuka atau ditinggal;
// antrian disimpan di Cache Storage supaya selamat waktu SW dimatikan browser. Yang sudah lewat waktunya ditampilkan
// waktu SW dibangunkan (periodicsync di app terpasang, atau pesan berikutnya). Ketuk notifikasi = buka atau fokus game.
const QKEY = new Request("/__kabar_queue");
const readQ = async () => { try { const r = await (await caches.open("kabar")).match(QKEY); return r ? await r.json() : []; } catch (e) { return []; } };
const writeQ = async q => { try { await (await caches.open("kabar")).put(QKEY, new Response(JSON.stringify(q), { headers: { "content-type": "application/json" } })); } catch (e) { /* ignore */ } };
async function flush() {
  const q = await readQ(), now = Date.now(), due = q.filter(x => x.ts <= now), rest = q.filter(x => x.ts > now);
  const open = (await self.clients.matchAll({ type: "window" })).some(c => c.visibilityState === "visible");
  // yang telat lebih dari 3 jam dibuang: kabar pagi yang datang sore cuma bikin bingung
  for (const x of due) if (!open && now - x.ts < 3 * 3600000) await self.registration.showNotification(x.title, { body: x.body, tag: "kabar-" + x.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: self.registration.scope + "?from=kabar" } });
  if (due.length) await writeQ(rest);
}
self.addEventListener("message", e => { if (e.data && e.data.type === "kabar") e.waitUntil(writeQ(e.data.list || [])); });
self.addEventListener("periodicsync", e => { if (e.tag === "kabar") e.waitUntil(flush()); });
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const c = all.find(w => w.url.startsWith(self.registration.scope));
    if (c) return c.focus();
    return self.clients.openWindow(url);
  })());
});

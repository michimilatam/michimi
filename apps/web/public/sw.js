// Service worker de Michimi: notificaciones push e instalación como app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Necesario para que el navegador ofrezca "Instalar app"
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "Michimi", body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(d.title || "Michimi", {
      body: d.body || "",
      icon: "/favicon-192.png",
      badge: "/favicon-192.png",
      tag: d.tag,
      renotify: !!d.tag,
      data: { url: d.url || "/mensajes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url === url && "focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});

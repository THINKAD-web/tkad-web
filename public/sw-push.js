/* eslint-disable no-restricted-globals */
/** Web Push — next-pwa importScripts 로 병합 */

self.addEventListener("push", (event) => {
  let data = { title: "THINKAD", body: "", url: "/ko" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    data.body = event.data?.text() ?? "";
  }
  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "tkad-push",
    data: { url: data.url || "/ko" },
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "PUSH_RECEIVED" });
        }
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/ko";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});

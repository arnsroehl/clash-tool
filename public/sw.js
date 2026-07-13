self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Clash Tool", body: "Deine Planung hat ein Update." };
  event.waitUntil(self.registration.showNotification(data.title || "Clash Tool", { body: data.body || "", icon: "/favicon.ico", data: { url: data.url || "/" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});

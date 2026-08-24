self.addEventListener('install', (e) => {
  // 경량 PWA: 설치 즉시 활성화 (기존 오프라인 캐시 없이 설치용 껍데기만 제공)
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // 별도의 캐싱을 하지 않고 네트워크 요청 통과
});

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: {
        url: data.url || 'https://kongdak.kr',
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      let matchingClient = null;
      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url === urlToOpen) {
          matchingClient = windowClient;
          break;
        }
      }
      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

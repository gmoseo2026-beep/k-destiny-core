self.addEventListener('install', (e) => {
  // 경량 PWA: 설치 즉시 활성화 (기존 오프라인 캐시 없이 설치용 껍데기만 제공)
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // 별도의 캐싱을 하지 않고 네트워크 요청 통과
});

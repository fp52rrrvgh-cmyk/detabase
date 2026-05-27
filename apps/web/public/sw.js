// Simple offline fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('離線模式：請檢查網路連線', { status: 503 })
    })
  );
});

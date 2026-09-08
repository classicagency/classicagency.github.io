/* Офлайн-кэш приложения «Ассистент». Версия 0aac3b58 меняется при каждой
   пересборке, поэтому старая копия не залипает после обновления.
   Файл шлюза (gate.json) не кэшируется никогда: в нём адрес туннеля,
   и вчерашний адрес хуже, чем его отсутствие. */
var CACHE = 'nk-assist-0aac3b58';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('gate.json') !== -1) return;
  // Всё, что уходит на другой адрес, — это движок на компьютере. Его ответы
  // кэшировать нельзя ни при каких условиях: первый ответ «работаю» ложился
  // в кэш и отдавался вечно, поэтому готовый ответ ассистента не появлялся
  // на экране никогда. Поймано на живой странице, тесты этого не видели —
  // двойник отвечал «готово» с первого раза.
  try {
    if (new URL(e.request.url).origin !== self.location.origin) return;
  } catch (err) { return; }

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    });
  }).catch(function () { return caches.match('./index.html'); }));
});

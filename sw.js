/* クレカ乗車運賃ナビ - Service Worker
   オフラインでもアプリ本体・運賃データを表示できるようにするためのキャッシュ層。
   fare.json はキャッシュを即返しつつバックグラウンドで最新版に更新（stale-while-revalidate）。
*/
const CACHE_NAME = "creka-fare-navi-v17";
const APP_SHELL = [
  "./",
  "./index.html",
  "./fare.json",
  "./manifest.json",
  /* どこでも運賃表 */
  "./map_tokyometro.json",
  "./運賃表ベース.svg",
  "./map_toei.json",
  "./運賃表ベース_toei.svg",
  "./アイコン画像/logo-line-tokyometro.svg",
  "./アイコン画像/logo-line-kotsumetro.svg",
  "./アイコン画像/favicon.ico",
  "./アイコン画像/apple-touch-icon.png",
  "./アイコン画像/icon-192.png",
  "./アイコン画像/icon-512.png",
  /* 路線案内（メトロ+都営+福岡市営地下鉄）用: ODPT生データ + 路線ナンバリング画像 */
  "./odpt_Station_metro.json",
  "./odpt_Station_toei.json",
  "./odpt_Railway_metro.json",
  "./odpt_Railway_toei.json",
  "./odpt_Station_fukuokacitysubway.json",
  "./odpt_Railway_fukuokacitysubway.json",
  "./路線ナンバリング/marunouchi.png",
  "./路線ナンバリング/chiyoda.png",
  "./路線ナンバリング/namboku.png",
  "./路線ナンバリング/fukutoshin.png",
  "./路線ナンバリング/ginza.png",
  "./路線ナンバリング/hanzomon.png",
  "./路線ナンバリング/hibiya.png",
  "./路線ナンバリング/tozai.png",
  "./路線ナンバリング/yurakucho.png",
  "./路線ナンバリング/Asakusa.png",
  "./路線ナンバリング/Mita.png",
  "./路線ナンバリング/Shinjuku.png",
  "./路線ナンバリング/oedo.png",
  "./路線ナンバリング/福岡市営地下鉄空港線(ナンバリング).png",
  "./路線ナンバリング/福岡市営地下鉄箱崎線(ナンバリング).png",
  "./路線ナンバリング/福岡市営地下鉄七隈線(ナンバリング).png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => { /* 初回オフライン等でaddAllが失敗しても致命的にしない */ })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* お知らせ(notices.json)は常にオンライン時の最新内容を取得したいため、
     このキャッシュ層（stale-while-revalidate）の対象から除外する。
     ここでrespondWithしなければブラウザの通常のfetchにフォールバックする。 */
  if (url.pathname.endsWith("/notices.json")) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        if (networkRes && networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

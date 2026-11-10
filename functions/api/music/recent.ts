import { getRecentMusic, musicTtl } from '../../../src/lib/edge/appleMusic';
import { serveApi } from '../../../src/lib/edge/http';

export const onRequestGet: PagesFunction = (context) => serveApi(context.request, {
  ttl: musicTtl,
  cache: caches.default,
  waitUntil: (promise) => context.waitUntil(promise),
  load: () => getRecentMusic(context.env),
});

export const onRequest: PagesFunction = onRequestGet;

import { getGitHubActivity, githubTtl } from '../../../src/lib/edge/github';
import { serveApi } from '../../../src/lib/edge/http';
import { githubUsername } from '../../../src/config/github';
import snapshot from '../../../src/data/github-snapshot.json';

export const onRequestGet: PagesFunction = (context) => serveApi(context.request, {
  ttl: githubTtl.activity,
  cache: caches.default,
  waitUntil: (promise) => context.waitUntil(promise),
  load: () => getGitHubActivity({
    username: githubUsername, token: context.env.GITHUB_TOKEN, fallbackEvents: snapshot.events,
  }),
});

// GET 以外のリクエストも共通の 405 応答へ渡す．
export const onRequest: PagesFunction = onRequestGet;

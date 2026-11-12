import { getGitHubContributions, githubTtl } from '../../../src/lib/edge/github';
import { serveApi } from '../../../src/lib/edge/http';
import { githubUsername } from '../../../src/config/github';

export const onRequestGet: PagesFunction = (context) => serveApi(context.request, {
  ttl: githubTtl.contributions,
  cache: caches.default,
  waitUntil: (promise) => context.waitUntil(promise),
  load: () => getGitHubContributions({
    username: githubUsername, token: context.env.GITHUB_TOKEN,
  }),
});

// GET 以外のリクエストも共通の 405 応答へ渡す．
export const onRequest: PagesFunction = onRequestGet;

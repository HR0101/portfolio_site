import { getGitHubRepos, githubTtl } from '../../../src/lib/edge/github';
import { serveApi } from '../../../src/lib/edge/http';
import { githubUsername } from '../../../src/config/github';
import snapshot from '../../../src/data/github-snapshot.json';

export const onRequestGet: PagesFunction = (context) => serveApi(context.request, {
  ttl: githubTtl.repos,
  cache: caches.default,
  waitUntil: (promise) => context.waitUntil(promise),
  load: () => getGitHubRepos({
    username: githubUsername, token: context.env.GITHUB_TOKEN, fallbackRepos: snapshot.repos,
  }),
});

// GET 以外のリクエストも共通の 405 応答へ渡す．
export const onRequest: PagesFunction = onRequestGet;

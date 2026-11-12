import { getGitHubActivity, githubTtl } from '../../../../lib/edge/github';
import { serveApi } from '../../../../lib/edge/http';
import { siteConfig } from '../../../../config/site';
import snapshot from '../../../../data/github-snapshot.json';

export function GET(request: Request) {
  return serveApi(request, {
    ttl: githubTtl.activity,
    load: () => getGitHubActivity({
      username: siteConfig.githubUsername, token: process.env.GITHUB_TOKEN, fallbackEvents: snapshot.events,
    }),
  });
}

// Next の HEAD / OPTIONS 自動応答も含め，GET 以外を 405 にそろえる．
export { GET as POST, GET as PUT, GET as PATCH, GET as DELETE, GET as HEAD, GET as OPTIONS };

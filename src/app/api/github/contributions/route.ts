import { getGitHubContributions, githubTtl } from '../../../../lib/edge/github';
import { serveApi } from '../../../../lib/edge/http';
import { siteConfig } from '../../../../config/site';

export function GET(request: Request) {
  return serveApi(request, {
    ttl: githubTtl.contributions,
    load: () => getGitHubContributions({
      username: siteConfig.githubUsername, token: process.env.GITHUB_TOKEN,
    }),
  });
}

// Next の HEAD / OPTIONS 自動応答も含め，GET 以外を 405 にそろえる．
export { GET as POST, GET as PUT, GET as PATCH, GET as DELETE, GET as HEAD, GET as OPTIONS };

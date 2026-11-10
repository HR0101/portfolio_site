import { getRecentMusic, musicTtl } from '../../../../lib/edge/appleMusic';
import { serveApi } from '../../../../lib/edge/http';

export function GET(request: Request) {
  return serveApi(request, {
    ttl: musicTtl,
    load: () => getRecentMusic({
      APPLE_MUSIC_TEAM_ID: process.env.APPLE_MUSIC_TEAM_ID,
      APPLE_MUSIC_KEY_ID: process.env.APPLE_MUSIC_KEY_ID,
      APPLE_MUSIC_PRIVATE_KEY: process.env.APPLE_MUSIC_PRIVATE_KEY,
      APPLE_MUSIC_USER_TOKEN: process.env.APPLE_MUSIC_USER_TOKEN,
    }),
  });
}

export { GET as POST, GET as PUT, GET as PATCH, GET as DELETE, GET as HEAD, GET as OPTIONS };

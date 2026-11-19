import { getRecentMusic, musicTtl, type RecentTrack } from '../../../../lib/edge/appleMusic';
import { serveApi } from '../../../../lib/edge/http';

// ローカルの開発サーバーで，Apple Music の設定が無いときだけ返す見本（ジャケットの表示を確かめるため）．
// 本番のビルドでは NODE_ENV が production なので使われない
const previewCoverBase = 'https://is1-ssl.mzstatic.com/image/thumb/';
const previewCoverA = `${previewCoverBase}Music211/v4/5b/5f/be/5b5fbe0b-34e6-8092-f115-4204bd2bfdcc/PPTF-8174.jpg/120x120bb.jpg`;
const previewCoverB = `${previewCoverBase}Music221/v4/4c/21/2c/4c212c14-1bab-daa0-e0b9-5e9129d8c9b1/TFDS-01226.jpg/120x120bb.jpg`;
const previewTracks: RecentTrack[] = Array.from({ length: 15 }, (_, index) => ({
  title: `見本の曲 ${index + 1}`,
  artist: '見本のアーティスト',
  album: index === 14 ? '見本のシングル' : '見本のアルバム',
  // 最後の 1 曲だけ別のジャケットにして，切り替えの違いが分かるようにする
  artworkUrl: index === 14 ? previewCoverB : previewCoverA,
  url: 'https://music.apple.com/',
}));
const isPreview = process.env.NODE_ENV === 'development' && !process.env.APPLE_MUSIC_USER_TOKEN;

export function GET(request: Request) {
  return serveApi(request, {
    ttl: musicTtl,
    load: isPreview ? async () => ({ tracks: previewTracks, apiStatus: 'success' as const }) : () => getRecentMusic({
      APPLE_MUSIC_TEAM_ID: process.env.APPLE_MUSIC_TEAM_ID,
      APPLE_MUSIC_KEY_ID: process.env.APPLE_MUSIC_KEY_ID,
      APPLE_MUSIC_PRIVATE_KEY: process.env.APPLE_MUSIC_PRIVATE_KEY,
      APPLE_MUSIC_USER_TOKEN: process.env.APPLE_MUSIC_USER_TOKEN,
    }),
  });
}

export { GET as POST, GET as PUT, GET as PATCH, GET as DELETE, GET as HEAD, GET as OPTIONS };

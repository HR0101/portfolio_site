import type { MetadataRoute } from 'next';

// 内容がリクエストに依存しないため，静的ファイルとして書き出す
export const dynamic = 'force-static';
import { siteConfig } from '../config/site';

// ホーム画面に追加したときの表示設定
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.displayName} | iOS & macOS App Portfolio`,
    short_name: siteConfig.displayName,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#fbfaf9',
    theme_color: '#fbfaf9',
    lang: 'ja',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/favicons/mono/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicons/mono/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicons/mono/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

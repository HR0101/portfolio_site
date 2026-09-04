import type { MetadataRoute } from 'next';
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
    ],
  };
}

import type { MetadataRoute } from 'next';

// 内容がリクエストに依存しないため，静的ファイルとして書き出す
export const dynamic = 'force-static';
import { siteConfig } from '../config/site';

// クローラーへの指示．API ルートは検索結果に出す必要がないため除外する．
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}

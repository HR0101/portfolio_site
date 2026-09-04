import type { MetadataRoute } from 'next';
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

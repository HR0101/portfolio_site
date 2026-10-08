import type { MetadataRoute } from 'next';

// 内容がリクエストに依存しないため，静的ファイルとして書き出す
export const dynamic = 'force-static';
import { siteConfig } from '../config/site';
import { SWIFT_APPS } from '../data/apps';

// トップページとアプリ専用ページを登録する
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    // 専用ページを持つアプリを自動で並べる（apps.ts に detailHref を足せば追随する）
    ...SWIFT_APPS.filter((app) => app.detailHref).map((app) => ({
      url: `${siteConfig.siteUrl}${app.detailHref}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}

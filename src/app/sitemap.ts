import type { MetadataRoute } from 'next';
import { siteConfig } from '../config/site';

// 単一ページ構成のため，トップページのみを登録する
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}

import type { MetadataRoute } from 'next';

// 内容がリクエストに依存しないため，静的ファイルとして書き出す
export const dynamic = 'force-static';
import { siteConfig } from '../config/site';
import { FEATURES } from '../config/features';
import { OTHER_APPS_PATH, SWIFT_APPS } from '../data/apps';
import { ALL_WORKS, GAMES_PATH } from '../data/works';
import { LAB_PATH } from '../data/lab';
import { NOTES, NOTES_PATH } from '../data/notes';

// トップページとアプリ専用ページを登録する
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...['privacy', 'terms'].map((document) => ({
      url: `${siteConfig.siteUrl}/apps/bustimeapp/${document}/`,
      lastModified: new Date('2026-10-15T00:00:00+09:00'),
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
    // アイコンの素材がないアプリをまとめた「その他のアプリ」のページ
    {
      url: `${siteConfig.siteUrl}${OTHER_APPS_PATH}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    // ブラウザで遊べるゲームをまとめたページ
    {
      url: `${siteConfig.siteUrl}${GAMES_PATH}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    // 点・粒子・物理の小さな実験をまとめた「実験室」（FEATURES.lab が true のときだけ）
    ...(FEATURES.lab ? [{
      url: `${siteConfig.siteUrl}${LAB_PATH}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }] : []),
    // 制作ノートの一覧と，各記事（FEATURES.notes が true のときだけ．notes.ts に足せば追随する）
    ...(FEATURES.notes ? [
      {
        url: `${siteConfig.siteUrl}${NOTES_PATH}/`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      },
      ...NOTES.map((note) => ({
        url: `${siteConfig.siteUrl}${NOTES_PATH}/${note.slug}/`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ] : []),
    // 専用ページを持つアプリを自動で並べる（apps.ts / works.ts に detailHref を足せば追随する）
    ...[...SWIFT_APPS, ...ALL_WORKS].filter((app) => app.detailHref).map((app) => ({
      url: `${siteConfig.siteUrl}${app.detailHref}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}

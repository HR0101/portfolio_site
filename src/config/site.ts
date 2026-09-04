// サイト全体で使用する設定値．
const deploymentHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  deploymentHost ??
  'http://localhost:3001';
const siteUrlWithProtocol = /^https?:\/\//i.test(configuredSiteUrl)
  ? configuredSiteUrl
  : `https://${configuredSiteUrl}`;

export const siteConfig = {
  // GitHub のユーザー名（プレースホルダー：自身のアカウント名に変更可能）
  githubUsername: 'HR0101',
  // 画面に表示する名前
  displayName: 'Ryuto Hara',
  // 肩書き
  role: 'Computer Science Student / iOS & macOS App Developer',
  // 問い合わせ先メールアドレス（開発用アカウント）
  email: 'hr0101.dev@gmail.com',
  // GitHub プロフィールの URL
  githubUrl: 'https://github.com/HR0101',
  // サイトの公開 URL．デプロイ先が決まったら .env.local の
  // NEXT_PUBLIC_SITE_URL に設定する（OGP や sitemap の絶対 URL に使う）
  siteUrl: siteUrlWithProtocol.replace(/\/+$/, ''),
  // 検索結果や SNS 共有時に使う説明文
  description:
    'Swift / SwiftUI で個人開発した iPhone・Mac アプリを紹介するポートフォリオ．17プロダクトをソースコードごと GitHub に公開しています．',
} as const;

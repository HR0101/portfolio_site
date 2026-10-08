/** @type {import('next').NextConfig} */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const isDevelopment = process.env.NODE_ENV !== 'production';

// 開発時は React / Fast Refresh がデバッグ機能で eval を使うため 'unsafe-eval' を許可する．
// 本番ビルドでは eval を使わないので許可しない．
const scriptSrc = isDevelopment
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

// 開発時は HMR の WebSocket 接続を許可する
const connectSrc = isDevelopment
  ? "connect-src 'self' https://api.github.com ws: wss:"
  : "connect-src 'self' https://api.github.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  connectSrc,
  "font-src 'self' data:",
  "form-action 'self' mailto:",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https://ghchart.rshah.org",
  "object-src 'none'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
].join('; ');

// すべてのレスポンスに付けるセキュリティヘッダー
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // ブラウザの MIME 型推測を無効化する
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 他サイトへの iframe 埋め込みを禁止する
  { key: 'X-Frame-Options', value: 'DENY' },
  // 外部サイトへ送るリファラを最小限にする
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 使用しない端末機能を明示的に無効化する
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

// STATIC_EXPORT=1 のときは，サーバーを使わない静的ファイルとして書き出す．
// S3 + CloudFront など，Node を動かせない環境へ置くための形式．
const isStaticExport = process.env.STATIC_EXPORT === '1';

const nextConfig = {
  reactStrictMode: true,
  // 静的書き出し時は out/ にファイルを出し，末尾スラッシュ付きの URL にそろえる
  // （S3 のディレクトリ配信と相性がよい）
  ...(isStaticExport ? { output: 'export', trailingSlash: true, images: { unoptimized: true } } : {}),
  // 親ディレクトリの lockfile を誤検出せず，このリポジトリだけを対象にする
  turbopack: { root: projectRoot },
  // レスポンスヘッダーからフレームワーク名を隠す
  poweredByHeader: false,
  // 静的書き出しでは next.config の headers() は反映されない．
  // その場合は CloudFront のレスポンスヘッダーポリシー側で同じ内容を設定する（DEPLOY.md 参照）
  ...(isStaticExport
    ? {}
    : {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),
};

export default nextConfig;

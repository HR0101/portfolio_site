/** @type {import('next').NextConfig} */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://api.github.com",
  "font-src 'self' data:",
  "form-action 'self' mailto:",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https://ghchart.rshah.org",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
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

const nextConfig = {
  reactStrictMode: true,
  // 親ディレクトリの lockfile を誤検出せず，このリポジトリだけを対象にする
  turbopack: { root: projectRoot },
  // レスポンスヘッダーからフレームワーク名を隠す
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

GitHubユーザー「HR0101」のアクティビティを動的に表示する個人ポートフォリオサイト．Next.js 14（App Router）+ TypeScript + Tailwind CSS v4．2026-06 に全面リニューアルし，「Trust（信頼）」をテーマにしたダークモード基調・6セクション構成（Hero / About / Skills / Projects / GitHub / Contact）の単一ランディングページになった．要件の原文は `.agents/ORIGINAL_REQUEST.md`，旧構成の移行設計は `PROJECT.md`（歴史的資料）を参照．

## コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # .next を削除してから next build
npm start            # 本番サーバー起動
npm run lint         # next lint
```

- `.env.local` に `GITHUB_TOKEN` を設定すると，Contribution Graph の自前描画（GraphQL）とレート制限緩和が有効になる（`.env.local.example` 参照）．未設定でも全機能が動作する．
- **注意**: `tests/` の自作E2Eスイート（`node tests/run.js`・91件）は旧構成（Timeline / Blog セクション）の契約を検証しており，リニューアル後は**未更新（stale）**．`TEST_INFRA.md` / `TEST_READY.md` も同様に旧構成の記述．

## アーキテクチャ

### セクション構成と Server / Client 境界

`src/app/page.tsx`（Server）が `src/sections/` の6セクションを順に描画する．各セクションは自身の `<section id="...">` を持ち，Navbar のアンカーリンク（`#about` 等）と `scroll-mt-24` でスクロール位置を調整している．

- **Server**: `Hero`（CSSアニメーションのみ），`About`
- **Client**: `Skills`（習熟度バーのインビューアニメーション），`Projects`（プラットフォーム絞り込み），`GitHubActivity`（API フェッチ），`Contact`（フォーム状態），`Navbar`，`ThemeProvider` / `ThemeToggle`

`Projects`（見出しは "03. Apps"）は GitHub 上の Swift 製アプリを紹介するセクションで，データは `src/data/apps.ts` の `SWIFT_APPS` に集約している．サーバー＋クライアントのような2リポジトリ構成のプロダクトは1件にまとめ，`repositories` に両方を並べる．ここで定義した `tagline` は `findTaglineByRepository` 経由で GitHub セクションにも再利用され，description が空のリポジトリの説明を補う．

### アニメーション機構（依存ライブラリなし）

Framer Motion は不使用．`src/hooks/useInView.ts`（IntersectionObserver・一度表示したら解除）→ `src/components/Reveal.tsx`（`.reveal` / `.reveal-visible` クラス切替）→ `globals.css` の CSS トランジションという構成．`prefers-reduced-motion` 対応も `globals.css` 側で一括処理．Hero の登場アニメーションは `.hero-enter` + インライン `animationDelay` の段階表示．

### GitHub API のフォールバック設計

API Route は3本（`src/app/api/github/` 配下: `route.ts`=リポジトリ，`activity/route.ts`=イベント，`contributions/route.ts`=草）．**必ずHTTP 200を返し**，実際の状態はJSON内の `apiStatus`（`success` / `offline` / `rate_limited` / `no_token`）で伝える．クライアント側（`src/services/githubService.ts`）は localStorage に1時間キャッシュし，階層的フォールバック（キャッシュ → API → 静的モック `staticRepos` / `staticEvents`）でオフラインでも表示が崩れない．この設計を壊さないこと．

Contribution Graph は2段構え: `GITHUB_TOKEN` 設定時は GraphQL で取得して自前ヒートマップ描画（色は `globals.css` の `.contrib-0`〜`.contrib-4`），未設定時（`apiStatus: 'no_token'`）は外部画像 `ghchart.rshah.org` にフォールバック．

### テーマ（ダークモード基調）

デフォルトは**ダーク**．localStorage に明示的に `light` が保存されている場合のみライト表示（`layout.tsx` のフラッシュ防止スクリプトと `ThemeProvider.tsx` の両方に同じロジックがあり，変更時は両方を同期させること）．Tailwind v4 の `@variant dark` + `.dark` クラス方式．カスタムカラー（`night` / `night-soft` / `night-border`）は `globals.css` の `@theme` で定義．

### その他の注意点

- `lucide-react` 1.17 にはブランドアイコンがない．GitHubマークは自作の `src/components/icons/GitHubIcon.tsx` を使う．
- サイト全体の設定値（GitHubユーザー名・メール等のプレースホルダー）は `src/config/site.ts` に集約．
- `src/legacy/`: Vite時代の旧コード（`tsconfig.json` で除外済み）．参照用であり，編集対象外．
- ルートの `index.html` と `dist/` は Vite時代の残骸（旧テストランナー互換のため残置）．
- ルートの `package.json` は ESM，`tests/` は `tests/package.json` で CommonJS．

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

GitHubユーザー「HR0101」のアクティビティを動的に表示する個人ポートフォリオサイト．Next.js 16（App Router）+ TypeScript + Tailwind CSS v4．「Trust（信頼）」をテーマにしたライト／ダーク対応・6セクション構成（Hero / About / Skills / Projects / GitHub / Contact）の単一ランディングページ．移行設計は `PROJECT.md`（歴史的資料）を参照．

## コマンド

```bash
npm run dev          # 開発サーバー起動（http://localhost:3001）
npm run build        # .next を削除してから next build
npm start            # 本番サーバー起動
npm run lint         # ESLint（フラット設定．警告ゼロを維持する）
npm run typecheck    # tsc --noEmit
npm test             # E2E スモークテスト（先に npm run build が必要）
npm run check        # typecheck → lint → build → E2E をまとめて実行
```

- `.env.local` に `GITHUB_TOKEN` を設定すると，Contribution Graph の自前描画（GraphQL）とレート制限緩和が有効になる．`NEXT_PUBLIC_SITE_URL` はデプロイ先の URL で，OGP と sitemap の絶対 URL に使う（`.env.local.example` 参照）．ローカルでは未設定でも動作するが，公開時は正しい URL を必ず設定する（Vercel では本番 URL を自動検出）．
- **開発サーバーの起動中に `npm run build` を実行しない**．`.next` が消えて，起動中のサーバーが `Cannot find module './xxx.js'` で 500 を返すようになる（その場合は開発サーバーを再起動する）．

### テスト

`tests/e2e.test.mjs`（`node:test`・25ケース）が**本番ビルドを実際に起動して**検証する．検証範囲は，6セクションの存在／17プロダクトの掲載／公式WebPアイコン／GitHub リンクの実 URL／問い合わせ導線／タブの ARIA 実装／メタデータと構造化データ／robots・sitemap・OGP 画像／API ルートが必ず 200 と `apiStatus` を返すこと／404 ページ／セキュリティヘッダー．

```bash
npm run build && npm test
```

CI は `.github/workflows/ci.yml` で `typecheck → lint → build → test` を実行する．詳細は `TEST_INFRA.md`．

## アーキテクチャ

### セクション構成と Server / Client 境界

`src/app/page.tsx`（Server）が `src/sections/` の6セクションを順に描画する．各セクションは自身の `<section id="...">` を持ち，Navbar のアンカーリンク（`#about` 等）と `scroll-mt-24` でスクロール位置を調整している．

- **Server**: `Hero`（CSSアニメーションのみ），`About`
- **Client**: `Skills`（習熟度バーのインビューアニメーション），`Projects`（プラットフォーム絞り込み），`GitHubActivity`（API フェッチ），`Contact`（フォーム状態），`Navbar`，`ThemeProvider` / `ThemeToggle`

`Projects`（見出しは "03. Apps"）は GitHub 上の Swift 製アプリを紹介するセクションで，データは `src/data/apps.ts` の `SWIFT_APPS` に集約している．サーバー＋クライアントのような2リポジトリ構成のプロダクトは1件にまとめ，`repositories` に両方を並べる．ここで定義した `tagline` は `findTaglineByRepository` 経由で GitHub セクションにも再利用され，description が空のリポジトリの説明を補う．

### アニメーション機構（依存ライブラリなし・すべて TypeScript）

Framer Motion 等のアニメーションライブラリは不使用．CSS キーフレーム（`globals.css`）と自作フックの組み合わせで構成する．

- **スクロール登場**: `useInView`（IntersectionObserver・一度表示したら解除）→ `Reveal`（`variant` で `up` / `left` / `right` / `scale` / `blur` / `flip` を選択）→ `globals.css` のトランジション．
- **常時再生の演出**: `.animate-gradient`（グラデーション移動），`.animate-bob`（浮遊），`.animate-spin-slow`（回転リング），`.animate-marquee`（無限スクロール），`.animate-glow-pulse`，`.animate-caret`．
- **ホバー時**: `.animate-wiggle`（アイコンが揺れる），`.shimmer-sweep`（光沢が走る）．いずれも祖先の `.group` のホバーで発火する．
- **スクロール連動（scroll-linked）**: `src/lib/scrollObserver.ts` が **scroll / resize リスナーを全体で1本だけ**張り，rAF で間引いて購読者へ配る．新たにスクロール位置を見る処理を足すときは，必ず `subscribeToScroll` を使うこと（個別に `addEventListener('scroll')` を張らない）．`useScrollLinked(mode)` が要素ごとの進捗 0〜1 を返し，モードは `through`（視差）/ `enter`（登場）/ `leave`（退場）/ `fill`（線を描く）の4種．これを使う演出は `ScrollFadeOut`（Hero がスクロールで奥へ引く），`ParallaxLayer`（背景の視差），`ScrollMarquee`（スクロール量だけ横に流れる帯），`ScrollTimeline`（線が伸び，通過した節目が点灯する年表），Contribution Graph の左からの出現，`SectionHeading` のアクセントバー．
- **変形と計測の分離**: 自分が動かす要素の位置を測ると値が発振するため，`ScrollFadeOut` / `ParallaxLayer` は **計測用の外側 div と変形用の内側 div を分けている**．同種の演出を足すときも必ずこの形にすること．
- **JS 制御**: `useTilt`（カードの3Dチルト．CSS 変数 `--tilt-x` 等を直接書き換え，再描画を起こさない），`useScrollProgress`（ページ全体の進捗），`useCountUp`（数値の数え上げ），`useActiveSection`（Navbar のスクロールスパイ），`usePrefersReducedMotion`．
- **共通ラッパー**: `TiltCard` / `MagneticButton` / `AnimatedCounter` / `Marquee` / `TypingText` / `HoverBounceText` / `ConfettiButton`（ロゴクリックのイースターエッグ）/ `FloatingAppIcons` / `CursorGlow` / `ScrollProgressBar` / `BackToTopButton` / `ScrollFadeOut` / `ParallaxLayer` / `ScrollMarquee` / `ScrollTimeline`．年表の内容は `src/data/timeline.ts`．
- **アクセシビリティ**: `prefers-reduced-motion: reduce` で CSS 側は `globals.css` 末尾のブロックが一括停止し，JS 側は `usePrefersReducedMotion` を見る各コンポーネントが自ら無効化する．新しい演出を足したら**必ず両方に対応を入れること**．

Hero の登場アニメーションは `.hero-enter` + インライン `animationDelay` の段階表示．

### GitHub API のフォールバック設計

API Route は3本（`src/app/api/github/` 配下: `route.ts`=リポジトリ，`activity/route.ts`=イベント，`contributions/route.ts`=草）．**必ずHTTP 200を返し**，実際の状態はJSON内の `apiStatus`（`success` / `offline` / `rate_limited` / `no_token`）で伝える．クライアント側（`src/services/githubService.ts`）は localStorage に1時間キャッシュし，階層的フォールバック（キャッシュ → API → 静的モック `staticRepos` / `staticEvents`）でオフラインでも表示が崩れない．この設計を壊さないこと．

Contribution Graph は2段構え: `GITHUB_TOKEN` 設定時は GraphQL で取得して自前ヒートマップ描画（色は `globals.css` の `.contrib-0`〜`.contrib-4`），未設定時（`apiStatus: 'no_token'`）は外部画像 `ghchart.rshah.org` にフォールバック．

### テーマ（白基調・やわらかいトーン）

デフォルトは**ライト（白基調）**．localStorage に明示的に `dark` が保存されている場合のみダーク表示（`layout.tsx` のフラッシュ防止スクリプトと `ThemeProvider.tsx` の両方に同じロジックがあり，変更時は両方を同期させること）．Tailwind v4 の `@variant dark` + `.dark` クラス方式．

配色トークンは `globals.css` の `@theme` に集約している．

| トークン | 用途 |
| --- | --- |
| `cream` (#fbfaf9) | ページ背景（わずかに温かみのある白） |
| `mist` (#f3f4f7) | セクションやタグの淡い面 |
| `soft` (#ebedf3) | ボーダー（線を目立たせない） |
| `ink` (#313a4b) | 本文の文字色（真っ黒を避ける） |
| `night` / `night-soft` / `night-border` | ダークモードの背景・カード・ボーダー |

**やわらかい印象を保つための約束事**: 面は `bg-white` / `bg-mist`，線は `border-soft`，影は `shadow-soft` / `shadow-soft-lg`（広く淡い影．`shadow-sky-500/25` のような色付きの強い影は使わない），角丸は `rounded-3xl`（小さな要素は `rounded-2xl`），アイコンチップやカードヘッダーのグラデーションは **300〜400 番台**で組む（500〜600 番台は使わない），見出しは `font-semibold`（Hero の h1 のみ `font-bold`）．

### エラー時の画面

`src/app/not-found.tsx`（404）と `src/app/error.tsx`（想定外のエラー．`reset()` で再試行できる）を用意している．どちらもサイト本体と同じトーンで作ること．

### メタデータ・SEO

`src/app/` の**ファイル規約**で完結させている：`manifest.ts`（ホーム画面追加時の表示），`opengraph-image.tsx`（`next/og` の `ImageResponse` で共有カードを生成．**日本語フォントを埋め込んでいないため，画像内の文字は必ず欧文にすること**），`icon.svg`（ファビコン），`sitemap.ts`，`robots.ts`．`layout.tsx` の `metadata` は `metadataBase` を `siteConfig.siteUrl` に置き，OGP・Twitter カード・canonical・robots をまとめて定義している．構造化データ（Person / WebSite / ItemList）は `page.tsx` が JSON-LD として出力し，アプリ一覧は `SWIFT_APPS` から生成するので**アプリを足せば自動で反映される**．

### アクセシビリティの約束事

- 冒頭に「本文へスキップ」リンク（`.skip-link`）を置き，`<main id="main-content">` へ飛ばす．
- フォーカスリングは `globals.css` の `:focus-visible` で一括指定．`outline: none` を個別に書かない．
- Apps の絞り込みは WAI-ARIA のタブパターン（`role="tablist"` / `tabpanel`，ロービングタブインデックス，←→・Home・End キー対応）で実装している．タブを増やすときは `PLATFORM_FILTERS` に足すだけでキーボード操作も追随する．
- 本文の文字色は `slate-500` 以上の濃さを使う（`slate-400` は白背景でコントラスト不足）．
- フォームは項目ごとに `aria-invalid` / `aria-describedby` を出し，送信結果は `role="status"` の領域で伝える．

### 品質チェック

`npm run check`（typecheck → lint → build → E2E）が通ることを変更のたびに確認する．ESLint はフラット設定（`eslint.config.js`）で，`no-explicit-any` / `eqeqeq` / `prefer-const` などをエラー扱いにしている．Vite 時代の `react-refresh` プラグインは App Router と噛み合わないため外してある．

### その他の注意点

- `lucide-react` 1.17 にはブランドアイコンがない．GitHubマークは自作の `src/components/icons/GitHubIcon.tsx` を使う．
- サイト全体の設定値（GitHubユーザー名・メール等のプレースホルダー）は `src/config/site.ts` に集約．
- ルートの `package.json` は ESM．E2E テストも `.mjs` として同じ実行モデルにそろえている．

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

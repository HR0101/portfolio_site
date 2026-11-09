# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

GitHubユーザー「HR0101」のアクティビティを動的に表示する個人ポートフォリオサイト．Next.js 16（App Router）+ TypeScript + Tailwind CSS v4．「Trust（信頼）」をテーマにしたライト／ダーク対応・ランディングページ（Hero / ProductShowcase / About / Skills / Projects / Works / GitHub / Contact）と，主要アプリの専用ページ（`/apps/...`）で構成する．移行設計は `PROJECT.md`（歴史的資料）を参照．

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

`tests/e2e.test.mjs`（`node:test`・52ケース）が**本番ビルドを実際に起動して**検証する．検証範囲は，読み込み画面の土台と起動スクリプト／6セクションの存在／17プロダクトの掲載／公式WebPアイコン／GitHub リンクの実 URL／問い合わせ導線／タブの ARIA 実装／メタデータと構造化データ／robots・sitemap・OGP 画像／API ルートが必ず 200 と `apiStatus` を返すこと／紹介ページ末尾の「次のプロダクト」／404 ページ／セキュリティヘッダー．

```bash
npm run build && npm test
```

CI は `.github/workflows/ci.yml` で `typecheck → lint → build → test` を実行する．詳細は `TEST_INFRA.md`．公開は Cloudflare Pages の Git 連携で，ビルドコマンドに同じ検証を含めているためテストが落ちると公開されない．レスポンスヘッダーは `public/_headers`（CSP は `next.config.mjs` とそろえる）．設定は `DEPLOY.md`．

## アーキテクチャ

### セクション構成と Server / Client 境界

`src/app/page.tsx`（Server）が `src/sections/` の6セクションを順に描画する．各セクションは自身の `<section id="...">` を持ち，Navbar のアンカーリンク（`#about` 等）と `scroll-mt-24` でスクロール位置を調整している．

- **Server**: `Hero`（CSSアニメーションのみ）
- **Client**: `About`（PC では表示位置を固定し，スクロールでカードが粒子になって次の場所へ移り，再形成される），`Skills`（習熟度バーのインビューアニメーション），`Projects`（プラットフォーム絞り込み），`Works`（Web サービスとゲーム．大きな画面では画面を固定して横へ送る），`GitHubActivity`（API フェッチ），`Contact`（フォーム状態），`Navbar`，`ThemeProvider` / `ThemeToggle`

`Projects`（見出しは "03. Apps"）は GitHub 上の Swift 製アプリを紹介するセクションで，データは `src/data/apps.ts` の `SWIFT_APPS` に集約している．サーバー＋クライアントのような2リポジトリ構成のプロダクトは1件にまとめ，`repositories` に両方を並べる．ここで定義した `tagline` は `findTaglineByRepository` 経由で GitHub セクションにも再利用され，description が空のリポジトリの説明を補う．

### アプリ専用ページ（`src/app/apps/<app>/`）

主要なプロダクトには単独の紹介ページを用意している（現在は **BusTimeApp**・**Tsumugi**・**Subghost**・**EkiHub**・**Ark Server**（旧名 AllServerForMac））．Swift 以外の作品（Web サービスとゲーム）は `src/data/works.ts` に集約し，`detailHref` の扱いは `apps.ts` と同じ（sitemap と ⌘K に自動で並ぶ）．非公開リポジトリのゲームは `repository` を持たせない（ソースコードへのリンクを出さない）．トップページからの導線は `src/data/apps.ts` の `detailHref` 一箇所で管理し，Hero のアプリ棚・`ProductShowcase`・`Projects` のカード・`sitemap.ts`・⌘K の操作パネルがすべてこの値に追随する．**新しい詳細ページを足すときは `detailHref` を設定するだけでよい**（各所に個別のリンクを書き足さないこと）．紹介ページの末尾の「Next product」（`NextProductLink`．`src/app/apps/template.tsx` が差し込む）も同じ値から次のページを選ぶ．

各ページは自前の CSS モジュール（`product.module.css`）の中で配色を完結させており，サイト共通のトークンは使わない．BusTimeApp は青系，Tsumugi は生成り＋藍（経糸）＋金茶（緯糸），Subghost はアイコンに合わせたシアン＋紫（黒い画面の再現を含む）．ダーク時は `:global(.dark) .page` で CSS 変数をまとめて差し替える．CSS モジュールでは詳細度で負けやすいので，`.originInner p` のような子孫セレクタと単独クラスがぶつかる場合は `.originInner .originGlyph` のように親を重ねること．

- **BusTimeApp**: `demo-scene.tsx`（スクロール量をそのまま動画の再生位置に割り当てる），`sky-gallery.tsx`（時間帯ごとの背景），`app-icon-cube.tsx`．
- **Subghost**: `notch-stage.tsx`（MacBook のノッチとデスクトップを HTML/CSS で再現し，フック受信→Working→Done→通知までを再生する．`variant="panel"` ではセッション一覧を開いた状態で静止），`hook-flow.tsx`（CLI→ブリッジ→ソケット→本体の片方向の流れ．イベントを選ぶと状態が変わる），`pixel-ghost.tsx`（アイコンのドット絵を SVG で組み，OGP からも同じパターンを使う）．**スクリーンショットが1枚も無いアプリなので，画面はすべてWeb上の再現**．そのことを `figcaption` に必ず明記している（実際のアプリ画面だと誤解させない）．
- **EkiHub**: **画面はすべて ekihub.jp の実際の画面**（`public/projects/ekihub-screens/`．テーマ GLASS で「東京・川崎・船橋」「横浜・千葉」を検索して撮影）．`screen-tour.tsx`（入力→結果→所要時間→候補比較→周辺スポット→運行情報の6画面．WAI-ARIA のタブパターン），`pipeline-steps.tsx`（スクロールで縦線が伸び，算出の5段階が点灯する），`opengraph-image.tsx`．地図の欄は配信元の API キー未設定で透かしが出るため写していない（ページにも明記）．機能の説明は README ではなく今の画面で確かめたものだけを書く．配色は濃紺＋ティール（輪）＋青紫（軸）．
- **Ark Server**（旧名 AllServerForMac．ページは `/apps/arkserver`．旧 URL は `next.config.mjs` の `redirects()` と `public/_redirects` で恒久転送する）: **画面はすべて Mac 上で動いている実際のアプリ**（`public/projects/arkserver-screens/`）．実ライブラリは空なので，ffmpeg で作った色や図形の合成映像をアプリの `/upload` API で取り込んで撮る（個人の動画は映さない．図の注記にも明記）．`screen-tour.tsx`（ダッシュボード→ライブラリ→アルバム→プレイヤー→お楽しみ再生→差分を探す→切り替え再生→シーン抽出の8画面．WAI-ARIA のタブパターン），ブラウザ用の画面（`web-home` / `mob-home`）は同じサーバーをヘッドレス Chrome で撮ったもの．**ダッシュボードの接続先 URL と QR コードは LAN の情報なので，モザイクで隠してある**（撮り直すときも必ず隠すこと）．`phone-tour.tsx`（iPhone アプリ VideoPlayer の6画面．**実機ではなく Xcode のシミュレータ（iPhone 17 Pro）で撮ったもの**で，`ios-*.webp`．ステータスバーは `simctl status_bar override` で 9:41 に固定．自動操作のため，撮影用の複製（GitHub の HR0101/VideoPlayer）で無限ループのアニメーションだけ止めてある．図の注記にもシミュレータと明記）．**動きの部品**（すべて依存ライブラリなし）: `how-flow.tsx`（発見→認証→配信が3秒ごとに進む図．`data-step` で CSS が切り替わる），`mini-demos.tsx`（差分切り替え・シーン抽出・10等分の頭出しの再現デモ．実画面ではないと注記），`more-grid.tsx` / `more-data.ts`（39機能のカード．分野で絞り込み，押すと説明が開く．最初は各分野から1件ずつで，デモのカードは操作できる．機能の追加はデータだけ），`use-auto-tour.ts`（2つのタブツアーの自動再生．画面外・ホバー/フォーカス中・手で選んだあと・動きを減らす設定で止まる．`TOUR_INTERVAL_MS` は CSS の進行バーと同じ値）．動く部品は，画面に入っている間だけ進める（IntersectionObserver）．止めたときは最後の状態を見せ，`prefers-reduced-motion` は CSS の末尾のブロックと JS の両方で対応している．撮影用の PIN は一時的に変え，終わったら元へ戻す．**世界観は「方舟」だが，見た目は静かな海辺の光**（unslop 済み．記録は `docs/design/arkserver-unslop.md`）．ヒーローと締めは夜明け／夜の海の写真（`public/projects/arkserver-backgrounds/ocean-{dawn,night}.webp`．**生成物で，作り方と利用条件の記録がない**）の上に，実画面とサーバーの足場（SVG）を置く．面・線・文字は中立の灰，アクセントは海の青灰 1 色，見出しは 500〜600 の太さで，ヒーローと締めの見出しだけ明朝体．配信中の点灯（緑の小さな点）はヒーローの画面ラベルに **1 つだけ**．**写真の上の文字・ボタン・リンクは，面の色を敷いて読めるようにする**（`heroCaption`・`backLink` と同じ静かな面）．ヒーローのリードは文節ごとに `phrase`（`inline-block`）で包み，語の途中で折り返さない．句読点はサイトの表記（「，」「．」）にそろえる．**CSS は `product.module.css` 一本で，世代ごとの上書きを整理済み**（未使用のクラス・同じセレクタで上書きされた宣言・未使用の変数は取り除いた．足すときは既存の規則を書き換え，末尾へ上書きを積まない）．余白は 4px 格子（12px 以下の偶数の 2px 刻みは可），太さは 400/500/600．**アイコン `public/projects/arkserver.svg` は仮の図案**（アプリ側の正式なアイコンが決まったら，同じパスで差し替える）．**GitHub のリポジトリ名は，改名するまで旧名 `AllServerForMac` のまま**（`page.tsx` の `ARK_REPOSITORY` と `apps.ts` の `repositories`．改名したらここだけ直す）．水面の飾り（`waves.tsx`）は，仕組みの図の中だけの静止した波．紹介ページの「次のプロダクト」は `apps.ts` の掲載順（Subghost → BusTimeApp → Ark Server → Tsumugi）で，E2E がその順を確かめる．
- **Tsumugi**: `weave-loom.tsx`（信頼度＝経糸／鮮度＝緯糸として canvas に布を描く．同じ入力からは必ず同じ織りになる決定論的な擬似乱数を使い，画面に入ってから上から下へ織り上げる），`diagnosis-gallery.tsx`（5画面のタブ．WAI-ARIA のタブパターン），`half-life-chart.tsx`（鮮度の減衰カーブを SVG の `pathLength` で描き出す），`opengraph-image.tsx`（織り目を div で組んだ専用の共有カード）．

スクリーンショットは `public/projects/<app>-screens/` に置く．**ページから参照するものは WebP（幅840・品質82：`cwebp -resize 840 0 -q 82`）に変換すること**．PNG のままだと1枚 500〜700KB になり，WebP なら 60〜90KB に収まる．

### アニメーション機構（依存ライブラリなし・すべて TypeScript）

Framer Motion 等のアニメーションライブラリは不使用．CSS キーフレーム（`globals.css`）と自作フックの組み合わせで構成する．

- **スクロール登場**: `useInView`（IntersectionObserver・一度表示したら解除）→ `Reveal`（`variant` で `up` / `left` / `right` / `scale` / `blur` / `flip` を選択）→ `globals.css` のトランジション．
- **常時再生の演出**: `.animate-gradient`（グラデーション移動），`.animate-bob`（浮遊），`.animate-spin-slow`（回転リング），`.animate-marquee`（無限スクロール），`.animate-glow-pulse`，`.animate-caret`．
- **ホバー時**: `.animate-wiggle`（アイコンが揺れる），`.shimmer-sweep`（光沢が走る）．いずれも祖先の `.group` のホバーで発火する．
- **スクロール連動（scroll-linked）**: `src/lib/scrollObserver.ts` が **scroll / resize リスナーを全体で1本だけ**張り，rAF で間引いて購読者へ配る．新たにスクロール位置を見る処理を足すときは，必ず `subscribeToScroll` を使うこと（個別に `addEventListener('scroll')` を張らない）．`useScrollLinked(mode)` が要素ごとの進捗 0〜1 を返し，モードは `through`（視差）/ `enter`（登場）/ `leave`（退場）/ `fill`（線を描く）/ `read`（読ませる）/ `pin`（sticky で固定する区間）の6種．これを使う演出は `ScrollFadeOut`（Hero がスクロールで奥へ引く），`ParallaxLayer`（背景の視差），`ScrollMarquee`（スクロール量だけ横に流れる帯），`ScrollTimeline`（線が伸び，通過した節目が点灯する年表），`ScrollZoom`（奥から起き上がりながら等倍になる），`HorizontalPinGallery`（縦スクロールを横移動に置き換える．1024px 未満と動きを減らす設定では普通の横スワイプ），Contribution Graph の左からの出現，`SectionHeading` のアクセントバー．
- **変形と計測の分離**: 自分が動かす要素の位置を測ると値が発振するため，`ScrollFadeOut` / `ParallaxLayer` は **計測用の外側 div と変形用の内側 div を分けている**．同種の演出を足すときも必ずこの形にすること．
- **カーソル追従**: `SpotlightCard`（カーソル位置に淡い光だまり．CSS 変数を直接書き換える）．アプリカードと Works のカードで使う．
- **引力（サイト全体）**: カーソルの近く（縁から 240px 以内）にある要素が，近いほど強くカーソルへ寄る（最大 12px）．`CursorRing.tsx` の rAF ループが一手に引き受け，個別に `pointermove` を張らない．対象は，カード・見出し・文章のかたまりを包む **`.reveal`**（登場前のものと，画面幅の 75% を超える枠は除く）と，**`data-attract`** を付けた要素（`data-attract="decor"` は背景の装飾で 2.5 倍寄る）．動かすのは個別プロパティ **`translate`** なので，登場・ホバー・チルトの `transform` と重ねがけになり競合しない（`.reveal` に `translate` を当てる規則を書かないこと）．**ナビ・フッターのアイコン・タブなど，隣り合って並ぶ要素には付けない**（互いに寄って重なる，タブの下線とずれる）．PC のマウスのみ（`hover: hover` かつ `pointer: fine`，幅 761px 以上，動きを減らす設定では無効）．戻り終えたらインラインの `translate` は取り除かれる．値は `CursorRing.tsx` 冒頭の `ATTRACT_*` 定数．
- **カードの登場（画面の外から運ばれてくる）**: `Reveal` の `cardDirection`（`left` / `right`）を付けたカードは，登場前は**画面の外側に透明で置かれ**，スクロールで入ると横から滑り込む．距離は `calc(50vw + 50% + 96px)`（半画面＋カード幅の半分＋余白）で，画面幅やカード幅によらず外側から始まる（CSS は `motion.css`，WAAPI 側は `cardMotion.ts` の `CARD_ENTRANCE_REACH`．**2 か所の値をそろえること**）．固定の px 距離にすると，広い画面でカードが半透明のままページの途中に置かれる．さらに，カードの来た側へ**光の筋**（`.reveal[data-card-reveal]::before`）が伸びて先導し，着くころに縮んで消える（`position: relative` を足してあるが，子要素のレイアウトは変わらないことを確認済み）．筋が隣のカードを横切る配置（Skills の中央の列の Python カードなど）は `<Reveal tow={false}>` で外す．中央の列のカードには `cardDirection` を付けない．
- **読み込み画面（初回だけ）**: HUD 風の構成．中央に**ドットの世界地図**（日本だけ水色／青に光り，東京に波紋が出る．進捗に合わせて左から現れ，点がランダムに瞬く），左右に流れる**文字の列**（左は技術，右は `SWIFT_APPS` と `ALL_WORKS` の名前），左上に名前，右上に進捗の数字（00〜100）と回る環．数字が 100 になると，まず左右の文字の行が上から順に外へ抜け（`--row` 番号で 24ms ずつずらす），続いて地図と数字が薄れて名前だけが中央に寄り，**中央から円形に開いて**ヒーローへつながる（`PageLoader.tsx` / `PageLoader.css`．値は `lib/preloader.ts`）．色は**テーマに合わせる**（面は `--site-surface-soft`．ページ背景と同じ色だと開く縁が見えないため）．円は登録済みカスタムプロパティ `--loader-iris`（`@property`）を WAAPI で動かし，面のくり抜き（`mask-image`）と縁の帯（`.page-loader-ring`）が同じ値を読む．非対応のブラウザは薄れて消える．**地図のドットは `src/lib/worldDotMap.ts`**（自動生成．`scripts/generate-world-dots.mjs` が Natural Earth の陸地データ（パブリックドメイン）から作る．手で編集しない）で，描画は `lib/dotMapCanvas.ts`．色は CSS 変数から読み，まだ読めないうちは既定値で描いて読めた時点で固定する（開発サーバーでは作成時に読めないことがある）．構成と動きは unitedcarriers.com の序盤の演出を参考にした（コード・文言・フォント・画像は使っていない自作）．ヒーローの見出し（`.copy h1`）は，読み込み画面が開くと**左から帯が通るように現れる**（`Hero.module.css` の `--title-wipe`．動きを減らす設定では帯を使わず最初から全文を出す）．**同じタブで 1 回だけ**（`sessionStorage` の `portfolio:preloaded`）．最短 2 秒，読み込みが長引いても 4 秒で必ず開く．**出す・出さないの判定は `<head>` の起動スクリプト**（`layout.tsx`）が行い，初回だけ `<html>` に `is-preloading` を付ける．付かなければ（2 回目以降・動きを減らす設定・JS 無効・storage 不可）`display: none` のままで何も出ない．これにより最初の描画から出て，ちらつかない．読み込み画面が出ている間は，`html.is-preloading` で**ページ側の CSS アニメーションを止め**（`animation-play-state`），スクロールを固定し，本文・ナビ・フッター・スキップリンク（`INERT_TARGET_SELECTOR`）を `inert` にする（付けたものだけを開く瞬間に戻す）．⌘K の操作パネルも読み込み中は開かない（`CommandPalette.tsx` が `is-preloading` を見る）．**WAAPI のアニメーション（ヒーローの登場など）は PageLoader が見つけ次第止め**，開く瞬間にまとめて再生する．そのためヒーロー側のコードは読み込み画面を知らなくてよい．**タイマーで動く演出**（`TypingTerminal` のタイピングなど）は，`usePageRevealed()` が true になるまで始めない（画面が開いた瞬間から見せたいものに使う）．head のタイマーが 7 秒で `is-preloading` を必ず外すので，JS が止まってもページは固まらない．ダークモードは `--site-surface` などのトークンで自動的に合う．
- **ヒーローの空（最初は真っ黒 → 下へ移ると円の縁が現れて白になる）**: 参考：unitedcarriers.com の序盤の構成（色と構成の考え方のみ）．**ヒーローは真っ黒**で，文字はすべて白（`color:#fff` と `--hero-muted` / `--hero-blue` を明るくしてあり，ヒーローの中の色はこの変数で追従する）．下へ移ると，ヒーロー直後の帯（`.skyBridge`．`Hero.tsx` の `</section>` の次）から**黒い円の縁**が現れ，紫 → 鮮やかな青 → 水色 → 白と変わって次のセクションへつながる．動きは**文書の流れそのもの**（スクロール連動の CSS は使わない）．黒い円は**ヒーローの上端の中央を中心にした真円**（`radial-gradient(circle …)`）で，半径 `--sky-r0` は「ヒーローの下の隅までの距離 − 40px」（`hypot(50vw, --stage-h)`）．そのため最初の画面は黒く，下の隅にだけ紫が覗く．**丸みは円の半径で決まる**（半径が小さいほど強い）．楕円や縦のグラデーションにすると丸みが消える．縁の色の位置は `--sky-stops`（黒い円の半径からの px．縁の厚みは約 590px．読める情報のない移動区間を長くしないため詰めてある．水色〜白は比較的ゆったり）．**白のあと，次の暗い章（`#showcase`）へは灰色を経由させず，青の縁 `--sky-limb` を挟んで沈める**（白から直接暗い色へ混ぜると灰色の帯になる．ダークは haze → limb → end が単調に暗くなる値にして，縞が出ないようにする）．**ヒーロー（`.stage::before`）は中心を `50% 0`，帯は `50% calc(-1 * var(--stage-h))`** に置いて，同じ円の続きにする．`--stage-h` はヒーローの高さ（`max(100svh,720px)`．画面が低い・スマホは media で上書き）で，帯の高さも `--sky-r0` から計算する．**ヒーローと帯は兄弟要素なので，空の変数（`--sky-*`）は `.runway, .skyBridge` の両方に宣言する**（片方だと帯が透明になる．ダークも同様）．`hypot()` 非対応のブラウザは `--sky-r0` が固定値．`.peach` のぼかしは色づけない（要素は `useHeroMotion` のために残してある）．
- **文字の演出**: 分割した文字は `aria-hidden` にし，元の文字列を `sr-only` で別に置く（どの部品も同じ形にそろえている）．
  - `SectionHeading`：ラベルは `ScrambleText`（解読），見出しは `SplitTextReveal`（1文字ずつ立ち上がる），説明文は `PhraseReveal`（句ごとにぼかしから浮かぶ）．
  - `KineticText`：ページを開いた瞬間に1文字ずつ起き上がる．CSS だけで動くのでサーバーコンポーネントでも使える．`wave` で登場後に波が通り続ける（Hero と EkiHub の h1）．
  - `RotatingWords`：文中の1語を下から押し上げて入れ替え，枠の幅も次の語に合わせて伸び縮みする（Hero の「アプリ／Webサービス／ゲーム」）．
  - `RollLabel`：祖先に `roll-label-host` を付けると，ホバーで文字が上へ抜けて下から入る（Navbar・Hero・Works のボタン）．
  - `VelocityMarquee`：スクロール位置で大きな文字の帯が流れ，スクロールの速さで傾く（Apps と Works の間，Contact の前）．
  - `TypingTerminal`：ターミナルにコマンドを打ち込み（打鍵の間隔は少し揺らす），Enter で結果が1行ずつ流れ出て次のプロンプトに戻り，画面を消して次へ移る（Hero）．コマンドと結果は実際の出力の形式にそろえる（git push の範囲は実在のコミット）．
  - `RollingNumber`：桁ごとに数字が回る（Hero の公開プロダクト数，EkiHub デモの所要時間）．
- **開発サーバーの注意**: `globals.css` を書き換えても開発サーバーに反映されないことがある．そのときは開発サーバーを止めて `.next` を消してから起動し直す．
- **JS 制御**: `useTilt`（カードの3Dチルト．CSS 変数 `--tilt-x` 等を直接書き換え，再描画を起こさない），`useScrollProgress`（ページ全体の進捗），`useCountUp`（数値の数え上げ），`useActiveSection`（Navbar のスクロールスパイ．いま読んでいる項目の下へ短い線が滑る），`usePrefersReducedMotion`．
- **画面の切り替え（View Transitions API）**:
  - ページ間の移動：`src/app/template.tsx` と `src/app/apps/template.tsx` が `PageTransition`（React の `<ViewTransition>`）で包み，古いページが浮きながら消えて新しいページが下から現れる（`globals.css` の `page-enter` / `page-exit`）．Next.js 同梱の React canary にある `ViewTransition` の型は `src/types/react-view-transition.d.ts` で補っている．ナビゲーションは `view-transition-name: site-navbar` で別の層にし，移動中も動かさない．
  - 共有要素の変形：紹介ページへのリンクを押すと，そのカードの画面（`data-morph-scope` の中の `data-morph-source`．無ければリンク内の画像）が，移動先の主役の画面（`data-morph-target`．各紹介ページに1つ）へ移りながら形を変える（`ProductMorph.tsx`）．名前 `product-morph` は移動の間だけ付けて外す（付けたままだとテーマ切り替えの円から外れる）．新しい紹介ページを足したら，主役の画面に `data-morph-target` を付けること．
  - テーマの切り替え：`ThemeProvider` が `document.startViewTransition` を呼び，押した位置から新しい配色を円で広げる（ナビゲーションの層にも同じ円を重ねる）．切り替えの間は `<html>` に `is-theme-switching` を付けて色のトランジションを止める．非対応ブラウザと動きを減らす設定では即座に切り替わる．
- **自己紹介のカード（スクロールで粒子になって再形成される）**: `About.tsx`・`About.module.css`・`lib/cardParticles.ts`（動きの計算と描画．テストは `tests/card-particles.test.mjs`）．PC（幅 1000px 以上・高さ 760px 以上・動きを減らさない設定）では表示位置を固定し（`.track[data-pin]`，高さ 380svh），**4 枚のカードは常に DOM に置いたまま（検索・読み上げにも残る），左端か右端のどちらかに，高さだけが段階的に下がる場所（`CARD_SLOTS`：左上（高さ 0）→ 右（1/3）→ 左（2/3）→ 右下（1）．x は 0 か 1 だけ．`--slot-x/--slot-y`．カードを動かせる範囲 `.cardStack` は `.body` いっぱい）に絶対配置**し，いま正面の 1 枚だけが見える．切り替わるとき，カードは薄れてぼやけ（`--card-presence`），**同じ場所から粒子（約 3600 個）が立ちのぼって次のカードの場所へ流れ，到着した場所で面と縁の形に集まり直して**カードが濃さを戻す．粒子は面の上の位置（a, b）を持ち続けるので，出発のカードの形から出て到着のカードの形へ戻る．左の粒子から先に動き出し，途中は渦を巻いて散る．位置は進み具合だけで決まる純粋な計算（`evaluateParticle`）なので，スクロールに 1:1 で連動し，逆に戻しても同じ軌道をたどる．描画は `.cardStack` の中の canvas 1 枚（カードの外へ散る粒子のため，場所より `PARTICLE_MARGIN` だけ広い）で，スクロールのたびに同期して描き，カードが正面にあるあいだは何も描かない．位置の計算は `lib/showcaseStory.ts` の `getFlipPosition`（各章の中心で止まり，境目の前後で動く．動いている割合は `FLIP_SHARE`）・`getFlipPresence`．カードの寸法・核の位置・墨色の粒子の色は，画面の大きさとテーマが変わるたびに測り直す（`measure`．`ResizeObserver` と `MutationObserver`）．**項目の一覧（情報系の学生 …．`.chapters`）はカードの反対側に立ち，カードと同じ高さを追う**：カードが左端にあるあいだは右端，右端にあるあいだは左端（`getListSlot`．カードが次の場所へ移るたびに，反対側へ横切る）．位置は CSS 変数 `--list-x / --list-y`（`.body` に書く．固定表示のときだけ）で，スクロールに 1:1 で連動する（時間のトランジションは使わない）．カード（560px 幅）と一覧（200px 幅）は，幅 1000px でも重ならない．**粒子と回転の CSS は `[data-pin]` の中にだけ置く**（固定表示でない小画面・動きを減らす設定では，4 枚が重なって見える 1 枚だけを即座に切り替え，粒子は使わない）．項目を押すと，その章までスムーズにスクロールし，間のカードも順に粒子になって見せる（選択はスクロールに追従）．面の見た目は「**静かな暗い面に，点描の小さな惑星**」：ProductShowcase の点描の惑星（`DotPlanet`）と**同じ 1 つの要素**を，主張しすぎない小さな球（220px．暗い球の本体の上に白い点）にして，カードの右上に置くのが唯一の飾り．**惑星は最初から最後まで途切れず，アプリ紹介から自己紹介へも同じ要素が飛んでいき，カードの右上で 80 秒に 1 周ゆっくり自転し続ける**．面は光らせず（暗い紺黒のほぼ単色に，右上へ章の色をごくうっすら差すだけ），縁は細い 1.5px の線と上辺のかすかな光，影も控えめな 1 本だけ．**文字だけが白くはっきり浮かぶ**（見出し・本文・ラベル・アイコンは白か章の色を白へ寄せた `--about-glow`）．光らせる・金属にする・写真を敷く・星雲を描く，といった方向は試して戻した（**写実的にも派手にもしない**）．カードは外側の枠（`.slot`）が場所と影（`filter: drop-shadow`）を持ち，内側の `.card` が消える・現れるときの切り抜き（`mask-image`．`--card-presence` と `--mask-dir`）を受ける（影を切り抜きに巻き込まないため．**box-shadow を `.card` に戻さないこと**）．消えるカードは左から，再形成されるカードも左から現れ，粒子の動き出しと同じ向きにそろう．カードは暗いまま白いページに載るので，粒子の墨色は `.cardStack` の `color`（ライトは濃い紺，ダークは薄い青）で決め，運ばれる核は白い点＋墨色の細い縁（白い背景でも見える）で描く．試作した宇宙の画像（`public/about/space-*.webp`．Codex の画像生成．記録は `docs/design/about-space-images.md`）は，いまは使っていないが残してある．背景の大きな番号は線だけ，線画は細い光の線に章の色の光をまとう．カードは外側の枠（`.slot`）が場所と影（`filter: drop-shadow`）を持ち，内側の `.card` が消える・現れるときの切り抜き（`mask-image`．`--card-presence` と `--mask-dir`）を受ける（影を切り抜きに巻き込まないため．**box-shadow を `.card` に戻さないこと**）．消えるカードは左から，再形成されるカードも左から現れ，粒子の動き出しと同じ向きにそろう．カードは暗いまま白いページに載るので，粒子の墨色は `.cardStack` の `color`（ライトは濃い紺，ダークは薄い青）で決め，運ばれる核は白い点＋墨色の細い縁（白い背景でも見える）で描く．`getFlipFaces`（表裏 2 面で回す方式の名残）は `showcaseStory.ts` に残してあるが使っていない．
- **アプリ紹介 → 自己紹介の惑星の引き継ぎ**（`lib/sharedPlanet.ts`）: 惑星の canvas は `ProductShowcase` が持つ `DotPlanet` 1 つだけ（`position:fixed`）．`ProductShowcase` が `registerSharedPlanet` で操作の入口を登録し，`About` が `setAboutPlanetProvider` で「着地点（最初のカードの右上の角．ビューポートの座標）・自己紹介の固定表示が始まるスクロール位置 `startScroll`・もう始まっているか `owns`」を返す関数を登録する．**アプリ紹介の固定表示が終わった位置（`showcaseEnd`）から `startScroll` までの間（約 1 画面分のスクロール）に，惑星は画面の同じ位置に残ったまま（アプリ紹介の画面だけが上へ流れる）着地点へ飛び，大きさが縮み，後半で色がページの色から暗い面の色へ移る**（`--planet-tone`＝`DotPlanet.setTone`．1 でページの色／0 で白い点＋暗い球の本体）．`owns`（`About` の固定表示が始まった）以降は，位置・色・自転は `About` の `placePlanet` が決め，`ProductShowcase.measure` は惑星に何も書かない（同じ位置で引き継がれるので継ぎ目がない）．カードの切り替わり（粒子になるあいだ）も，惑星は消えずに次のカードの右上の角へ弧を描いて運ばれる（`getCoreTrail`）．`About` が固定表示でない（小画面・動きを減らす設定）ときは着地点を返さず，惑星はアプリ紹介と一緒に画面から出ていく．**惑星の `fixed` な canvas は `.showcase-stage` の重なりの中にあるので，自己紹介の上へ飛べるよう，固定表示のあいだ `.showcase-stage` に `z-index:3` を付けてある**（消すと惑星が自己紹介の裏へ隠れる）．小さく表示するときは，点を少し大きく描く（`dotPlanetCanvas.ts` の `dotBoost`．520px で 1 倍，220px で約 1.5 倍）．
- **惑星をページの最後まで残す（`PlanetTail`・`lib/planetTail.ts`）**: 自己紹介の固定表示が終わる位置（`endScroll`）から先は，`PlanetTail`（`page.tsx` の `<About />` の直後）が惑星を預かる．**惑星は暗い球の本体と白い点のまま（`setTone(0)`）変えない**．まず，最後のカードの右下の角から画面の左下の隅（ドック．88px．狭い画面は 68px）へ，約 0.8 画面分のスクロールで移り，そこで自転し続ける．ページの最後が近づくと，**フッターの大きな名前が現れる場所（まだ何もない）の中央へ向かう．向かう進み具合（`TailState.arrival`．`getSpotScrollRange`：名前の場所が画面の下端近くに現れるとき，またはページの最下端の `SPOT_MIN_FLIGHT_RATIO`＝0.9 画面分手前の早いほうから，最下端まで．最下端で必ず 1）は，スクロールそのもの**で，**移る・大きくなる（球の直径が名前の高さのほぼいっぱい＝`NAME_PLANET_RATIO`）・ほどけて文字になる，が全部この進み具合と同時に進む**（移ってからほどけるのではない）．名前が粒子で描かれていないとき（`data-particle-ready` が無い．タッチ・狭い画面など）は，惑星は向かわずドックに残り，名前は今までどおりに現れる．小画面・動きを減らす設定（自己紹介が固定表示でない）では何もしない．
- **惑星がほどけて名前の文字になる（`lib/wordmarkMerge.ts`・`particleWordmarkCanvas.ts`・`PlanetTail.tsx`）**: **進み具合（`arrival`）と同時に，惑星がバラバラにほどけ，その点が名前の粒子の置かれている場所へ流れ込んで，文字が現れる**．スクロールそのものに連動するので（時間では進めない），戻せば文字が惑星へ戻る．**惑星が文字になり終えるまで，名前の粒子は描かない**（`.footer-wordmark` の `data-wordmark-forming`．`PlanetTail` が自己紹介のあと・粒子の準備ができているあいだだけ付ける．付かなければ名前は普通に出る）．名前の粒子 1 つ 1 つが惑星の点のどれかから出てくる（`createMergePlan`．粒子は惑星の点より多いので，同じ点から何粒も出る．**同じ入力なら同じ割り当て**）．惑星は名前の canvas（名前の周り 100px だけ）の外から動き出すので，**点は画面いっぱいの重ね canvas（`PlanetTail` が持つ．`position:fixed`・`z-index:3`．ビューポートの座標）に描く**（`WordmarkMergeDetail.overlay`．名前の粒子の置き場所は，名前の canvas の位置を足して画面の座標に直す）．点は，惑星の絵（DotPlanet）と**同じ向き**（`DotPlanet.getView` を `projectPlanetPoints` に渡して同じ点を作る）で，いまの惑星の位置から始まるので，継ぎ目なく入れ替わる．惑星の絵（暗い球の本体）は進み具合 0〜0.3 で薄れ（`getMergeLook`），点の色は惑星の白から名前の粒子の色（文字は墨色，最後の「.」は章の色）へ混ざる．スクロールが止まっていても惑星は回るので，ほどけている間は毎フレーム描き直す．描画は，同じ色・濃さの点を 1 回の塗りにまとめる（約 5 千個）．名前の粒子は，画面の下 1 画面分まで入ったら用意する（`IntersectionObserver` の `rootMargin`）．終わると惑星は消え（`setOpacity(0)`・自転停止），名前だけが残る．
- **見出しの下の一文**（`ABOUT_STATEMENT`）も同じ位置で灯る：カードと同じ数（4）の区切りに分け，k 番目の区切りが k 番目のカードへ向かう間（位置 k-1 → k）に muted → ink の色へ灯り（学生 → アプリ → ハードウェア → 信頼），区切りの中は文節ごとに左から順に灯る．灯り具合は `stage` に書く CSS 変数 `--lit-k`（`getFlipLight`）から決まり，**固定表示のときだけ書く**（小画面・動きを減らす設定では変数を消し，全文が灯った状態で出る．色の関数に対応しないブラウザも説明文の色のまま読める）．文字を分割しないので，読み上げには普通の文として渡る．説明文を自前で出すため，`SectionHeading` に `descriptionContent`（`description` の代わりに使える）を足してある．
- **カードの小さな英字ラベル**（`LEARNING` など）も同じ値で動く：カードが粒子になるほど文字が並べ替わり（`getShuffledLabel`．元の文字を並べ替えただけで，空白は動かさない．同じ入力からは必ず同じ並びなのでちらつかない），カードが戻ると左から順に元の文字へ戻る．戻り具合はカードの濃さ（`getFlipPresence`）と同じで，時間ではなくスクロールで進む．ラベルは `aria-hidden` なので並べ替わった文字は読み上げられない．固定表示でないときは並べ替えない．
- **小さな状態の変化**: アイコンの入れ替え（メニューの開閉・コピー完了）は `key` で作り直して `.icon-swap` で回りながら現す．遅延読み込みの画像は `ImageReveal`（レイアウトに1つ）が印を付け，読み込み終わるとぼかしから浮かぶ（`:where()` で詳細度 0 にして各部品の動きを上書きしない）．Contribution Graph のマスは `ContributionTooltip` の吹き出しで日付と数を出す（マスに `data-contribution-date` / `data-contribution-count`）．問い合わせの誤りと送信結果，⌘K の操作パネルの開閉も動きで伝える．
- **CSS のスクロール連動**: 規約ページの各節・フッター上段・Subghost の状態表は `animation-timeline: view()` で画面に入るところで浮かぶ（`@supports` で囲み，非対応ブラウザでは最初から表示）．ホバーで `translate` を使う要素では，キーフレームを `transform` で書いてぶつけないこと．
- **フッター・404・操作パネル**: フッターの大きな名前（`FooterWordmark`．画面に入ると1文字ずつ起き上がる）と日本時間の時計（`JapanClock`）は `FooterMotion.tsx`．404 は数字のリールが回って止まり，Hero と同じ `TypingTerminal` が実際の zsh の出力で迷子を表す．⌘K の操作パネルは選択中の行の背後を面が滑る．
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

### フォント

Apple 純正の組み合わせを使い，Web フォントは読み込まない（外部リクエスト・自前ホストとも無し）．`globals.css` の `@theme` で `--font-sans` を定義している．

- 欧文: **San Francisco**（`-apple-system` / `BlinkMacSystemFont` で解決）
- 和文: **ヒラギノ角ゴシック**（`Hiragino Sans` を先に置く．同書体の現行名で W0〜W9 を持ち，`font-semibold` などの太さが正しく出る．次点で `Hiragino Kaku Gothic ProN`）
- Apple 以外: Segoe UI → 游ゴシック → Noto Sans JP → メイリオ
- 等幅は `--font-mono` で SF Mono を優先

**書体を足すときの注意**: 日本語サイトなので，和文グリフを持たない欧文専用フォントを本文へ当てない（フォールバックが混ざり字面が乱れる）．

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

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

`tests/e2e.test.mjs`（`node:test`・50ケース）が**本番ビルドを実際に起動して**検証する．検証範囲は，6セクションの存在／17プロダクトの掲載／公式WebPアイコン／GitHub リンクの実 URL／問い合わせ導線／タブの ARIA 実装／メタデータと構造化データ／robots・sitemap・OGP 画像／API ルートが必ず 200 と `apiStatus` を返すこと／紹介ページ末尾の「次のプロダクト」／404 ページ／セキュリティヘッダー．

```bash
npm run build && npm test
```

CI は `.github/workflows/ci.yml` で `typecheck → lint → build → test` を実行する．詳細は `TEST_INFRA.md`．公開は Cloudflare Pages の Git 連携で，ビルドコマンドに同じ検証を含めているためテストが落ちると公開されない．レスポンスヘッダーは `public/_headers`（CSP は `next.config.mjs` とそろえる）．設定は `DEPLOY.md`．

## アーキテクチャ

### セクション構成と Server / Client 境界

`src/app/page.tsx`（Server）が `src/sections/` の6セクションを順に描画する．各セクションは自身の `<section id="...">` を持ち，Navbar のアンカーリンク（`#about` 等）と `scroll-mt-24` でスクロール位置を調整している．

- **Server**: `Hero`（CSSアニメーションのみ），`About`
- **Client**: `Skills`（習熟度バーのインビューアニメーション），`Projects`（プラットフォーム絞り込み），`Works`（Web サービスとゲーム．大きな画面では画面を固定して横へ送る），`GitHubActivity`（API フェッチ），`Contact`（フォーム状態），`Navbar`，`ThemeProvider` / `ThemeToggle`

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

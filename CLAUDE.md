# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

GitHubユーザー「HR0101」のアクティビティを動的に表示する個人ポートフォリオサイト．Next.js 16（App Router）+ TypeScript + Tailwind CSS v4．「Trust（信頼）」をテーマにしたライト／ダーク対応・ランディングページ（Hero / ProductShowcase / About / Skills / Projects / Works / GitHub / Profile / Contact）と，主要アプリの専用ページ（`/apps/...`），その他のアプリ（`/apps/others`），ゲーム（`/games`）で構成する．移行設計は `PROJECT.md`（歴史的資料）を参照．

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

`tests/e2e.test.mjs`（`node:test`・79ケース．単体テストを含めた全体は 453 件）が**本番ビルドを実際に起動して**検証する．検証範囲は，読み込み画面の土台と起動スクリプト／6セクションの存在／17プロダクトの掲載／公式WebPアイコン／GitHub リンクの実 URL／問い合わせ導線／アイコンの壁の構造（6 タイルの掲載順・選択ボタン）と，その他のアプリのページ（11 本）／メタデータと構造化データ／robots・sitemap・OGP 画像／API ルートが必ず 200 と `apiStatus` を返すこと／紹介ページ末尾の「次のプロダクト」／404 ページ／セキュリティヘッダー．

```bash
npm run build && npm test
```

CI は `.github/workflows/ci.yml` で `typecheck → lint → build → test` を実行する．詳細は `TEST_INFRA.md`．公開は Cloudflare Pages の Git 連携で，ビルドコマンドに同じ検証を含めているためテストが落ちると公開されない．レスポンスヘッダーは `public/_headers`（CSP は `next.config.mjs` とそろえる）．設定は `DEPLOY.md`．

## アーキテクチャ

### セクション構成と Server / Client 境界

`src/app/page.tsx`（Server）が `src/sections/` のセクションを順に描画する（About・Skills・Apps・Web Service・GitHub・Profile・Contact の番号つきセクション）．各セクションは自身の `<section id="...">` を持ち，Navbar のアンカーリンク（`#about` 等）と `scroll-mt-24` でスクロール位置を調整している．

- **Server**: `Hero`（CSSアニメーションのみ）
- **Client**: `About`（PC では表示位置を固定し，スクロールでカードが粒子になって次の場所へ移り，再形成される），`Skills`（習熟度バーのインビューアニメーション），`Projects`（アイコンの壁．アイコンの素材があるアプリだけを，PC では表示位置を固定し，スクロールで 1 本ずつ大きな紹介パネルへ育てる．残りは `/apps/others` で紹介），`Works`（Web サービス＝EkiHub のカードと，ゲームのページ `/games` への案内．ゲームは別ページ），`GitHubActivity`（API フェッチ），`Contact`（フォーム状態），`Navbar`，`ThemeProvider` / `ThemeToggle`

`Projects`（見出しは "03. Apps"）は GitHub 上の Swift 製アプリを紹介するセクションで，データは `src/data/apps.ts` の `SWIFT_APPS` に集約している．サーバー＋クライアントのような2リポジトリ構成のプロダクトは1件にまとめ，`repositories` に両方を並べる．ここで定義した `tagline` は `findTaglineByRepository` 経由で GitHub セクションにも再利用され，description が空のリポジトリの説明を補う．

**Apps の見せ方（アイコンの壁．`Projects.tsx`・`Projects.module.css`・`lib/appWall.ts`．テストは `tests/app-wall.test.mjs`）**: **アイコンの素材（`imageSrc`）があるアプリだけ**（`apps.ts` の `WALL_APPS`．いまは 6 本）を壁に並べる．素材がないアプリ（`OTHER_APPS`．11 本）は，トップには並べず，別ページ **`/apps/others`**（`src/app/apps/others/`．カードの一覧）で紹介する．アイコンを用意して `imageSrc` を足せば，自動で壁へ移る（ページ側は何も直さない）．壁は，最初は同じ大きさのアイコンの壁（名前つき．9 本以下なら 2 行，それ以上は 6 列）として見せる．スクロールすると壁がほどけ，**1 本ずつ中央の大きな紹介パネル（実画面または大きなアイコン，名前，説明，タグ，詳細ページと GitHub へのリンク）へ育つ**．まだ見ていないアプリは右の山，見終えたアプリは左の山に小さいまま並び（山の席はパネルに近い列から上→下の順．空いた席は点線の枠で見える），次へ進むときに動くのは「パネルから左の山へ戻るタイル」と「右の山からパネルへ育つタイル」の 2 つだけ．最後まで見ると，もう一度，壁へ戻る．停止位置 `q`（0 = 一覧，i + 1 = i 番目のアプリのパネル，count + 1 = 一覧に戻った状態）で表し，各停止位置で止まって読ませ，そのあいだで動く（`getWallPosition`．位置の計算はすべて `appWall.ts` の純粋関数で，スクロールに 1:1 で連動し，戻せば同じ道をたどる）．タイルは 1 要素（`li`）で，位置・大きさ・育ち具合 `--g`・角丸 `--r` を `Projects.tsx` が毎フレーム直接書く（再描画は先頭のアプリが変わるときだけ）．小さいときは顔（`.iconLayer`）が短いほうの辺いっぱいのアイコンで，育つにつれて薄れ，パネルの大きさで組んだ中身（`.detail`．`--panel-w/h` で寸法を固定）が左上から現れる（`--g` が `OPEN_GROWTH` を超えたタイルだけ `data-open="true"` になり，リンクを操作できる）．パネルへ育つタイルは，出ていくタイルが退いてから動き出す（`IN_DELAY` / `OUT_SHARE`）．小さなタイルの大きさと山の列数は，壁の広さに応じて，パネルの幅が `WALL_MIN_PANEL_WIDTH` を割らない最大のものを選ぶ（`createWallLayout`）．パネルの幅には上限（`WALL_MAX_PANEL_WIDTH`）があり，余った幅は山とパネルの間にあく．山が低いときは縦の中央へ寄せる．**壁のアプリは常に DOM に置く**（検索・読み上げ・SEO．17 プロダクト全体の構造化データ・サイトマップ・⌘K・Navbar の Apps メニューは，その他のアプリのページも含めて残す）．固定表示にする条件は自己紹介と同じ（幅 1000px 以上・高さ 760px 以上・動きを減らさない設定）で，`.track[data-pin]` を JS が付ける．付かないとき（小さい画面・動きを減らす設定）は，同じ要素が**普通のカードの一覧**（`auto-fill`．末尾に「その他のアプリ」への誘導つき）になる．スクロールの長さは `--stops`（停止位置の数）× 46svh．小さいタイルを押すとそのアプリまでスムーズにスクロールする（間のアプリも順に見せる）．固定表示の下端の左は惑星のドックがあるので，フッターの文字は左を空けてある．紹介ページへの共有要素の変形（`ProductMorph`）のため，各パネルは `data-morph-scope`，画面（なければアイコン）は `data-morph-source` を持つ．画面は `loading="lazy"`．年表（開発の軌跡）は Profile セクションへ移した（Apps の下には続かない）．プラットフォーム絞り込みは廃止した（`PLATFORM_FILTERS` / `matchesPlatform` はデータ側に残してある）．

### アプリ専用ページ（`src/app/apps/<app>/`）

主要なプロダクトには単独の紹介ページを用意している（現在は **BusTimeApp**・**Tsumugi**・**Subghost**・**EkiHub**・**Ark Server**（旧名 AllServerForMac））．Swift 以外の作品（Web サービスとゲーム）は `src/data/works.ts` に集約し，**ゲームは色味がサイトと合わないため，トップの Works から別ページ `/games`（`src/app/games/page.tsx`）へ移した**（横へ流れるギャラリー `GamesGallery`＝`src/sections/GamesGallery.tsx` と，ピッとマートのお仕事の帯．デザインはそのまま．スタイルは `globals.css` の `.works-game-*` / `.works-games-intro` に残してある．EkiHub と GitHub へのリンク一式 `WorkLinks` は `src/components/WorkLinks.tsx` で共有）．トップの Works は EkiHub のカードの下に，`/games` への案内（`GAMES_PATH`）を置く．`detailHref` の扱いは `apps.ts` と同じ（sitemap と ⌘K に自動で並ぶ）．非公開リポジトリのゲームは `repository` を持たせない（ソースコードへのリンクを出さない）．トップページからの導線は `src/data/apps.ts` の `detailHref` 一箇所で管理し，Hero のアプリ棚・`ProductShowcase`・`Projects` のカード・`sitemap.ts`・⌘K の操作パネルがすべてこの値に追随する．**新しい詳細ページを足すときは `detailHref` を設定するだけでよい**（各所に個別のリンクを書き足さないこと）．紹介ページの末尾の「Next product」（`NextProductLink`．`src/app/apps/template.tsx` が差し込む）も同じ値から次のページを選ぶ．

各ページは自前の CSS モジュール（`product.module.css`）の中で配色を完結させており，サイト共通のトークンは使わない．BusTimeApp は青系，Tsumugi は生成り＋藍（経糸）＋金茶（緯糸），Subghost はアイコンに合わせたシアン＋紫（黒い画面の再現を含む）．ダーク時は `:global(.dark) .page` で CSS 変数をまとめて差し替える．CSS モジュールでは詳細度で負けやすいので，`.originInner p` のような子孫セレクタと単独クラスがぶつかる場合は `.originInner .originGlyph` のように親を重ねること．

- **BusTimeApp**: `demo-scene.tsx`（スクロール量をそのまま動画の再生位置に割り当てる），`sky-gallery.tsx`（時間帯ごとの背景），`app-icon-cube.tsx`．
- **Subghost**: `notch-stage.tsx`（MacBook のノッチとデスクトップを HTML/CSS で再現し，フック受信→Working→Done→通知までを再生する．`variant="panel"` ではセッション一覧を開いた状態で静止），`hook-flow.tsx`（CLI→ブリッジ→ソケット→本体の片方向の流れ．イベントを選ぶと状態が変わる），`pixel-ghost.tsx`（アイコンのドット絵を SVG で組み，OGP からも同じパターンを使う）．**スクリーンショットが1枚も無いアプリなので，画面はすべてWeb上の再現**．そのことを `figcaption` に必ず明記している（実際のアプリ画面だと誤解させない）．
- **EkiHub**: **画面はすべて ekihub.jp の実際の画面**（`public/projects/ekihub-screens/`．テーマ GLASS で「東京・川崎・船橋」「横浜・千葉」を検索して撮影）．`screen-tour.tsx`（入力→結果→所要時間→候補比較→周辺スポット→運行情報の6画面．WAI-ARIA のタブパターン），`pipeline-steps.tsx`（スクロールで縦線が伸び，算出の5段階が点灯する），`opengraph-image.tsx`．地図の欄は配信元の API キー未設定で透かしが出るため写していない（ページにも明記）．機能の説明は README ではなく今の画面で確かめたものだけを書く．配色は濃紺＋ティール（輪）＋青紫（軸）．
- **Ark Server**（旧名 AllServerForMac．ページは `/apps/arkserver`．旧 URL は `next.config.mjs` の `redirects()` と `public/_redirects` で恒久転送する）: **画面はすべて Mac 上で動いている実際のアプリ**（`public/projects/arkserver-screens/`）．実ライブラリは空なので，ffmpeg で作った色や図形の合成映像をアプリの `/upload` API で取り込んで撮る（個人の動画は映さない．図の注記にも明記）．`screen-tour.tsx`（ダッシュボード→ライブラリ→アルバム→プレイヤー→お楽しみ再生→差分を探す→切り替え再生→シーン抽出の8画面．WAI-ARIA のタブパターン），ブラウザ用の画面（`web-home` / `mob-home`）は同じサーバーをヘッドレス Chrome で撮ったもの．**ダッシュボードの接続先 URL と QR コードは LAN の情報なので，モザイクで隠してある**（撮り直すときも必ず隠すこと）．`phone-tour.tsx`（iPhone アプリ VideoPlayer の6画面．**実機ではなく Xcode のシミュレータ（iPhone 17 Pro）で撮ったもの**で，`ios-*.webp`．ステータスバーは `simctl status_bar override` で 9:41 に固定．自動操作のため，撮影用の複製（GitHub の HR0101/VideoPlayer）で無限ループのアニメーションだけ止めてある．図の注記にもシミュレータと明記）．**動きの部品**（すべて依存ライブラリなし）: `how-flow.tsx`（発見→認証→配信が3秒ごとに進む図．`data-step` で CSS が切り替わる），`mini-demos.tsx`（差分切り替え・シーン抽出・10等分の頭出しの再現デモ．実画面ではないと注記），`more-grid.tsx` / `more-data.ts`（39機能のカード．分野で絞り込み，押すと説明が開く．最初は各分野から1件ずつで，デモのカードは操作できる．機能の追加はデータだけ），`use-auto-tour.ts`（2つのタブツアーの自動再生．画面外・ホバー/フォーカス中・手で選んだあと・動きを減らす設定で止まる．`TOUR_INTERVAL_MS` は CSS の進行バーと同じ値）．動く部品は，画面に入っている間だけ進める（IntersectionObserver）．止めたときは最後の状態を見せ，`prefers-reduced-motion` は CSS の末尾のブロックと JS の両方で対応している．撮影用の PIN は一時的に変え，終わったら元へ戻す．**世界観は「方舟」だが，見た目は静かな海辺の光**（unslop 済み．記録は `docs/design/arkserver-unslop.md`）．ヒーローと締めは夜明け／夜の海の写真（`public/projects/arkserver-backgrounds/ocean-{dawn,night}.webp`．**生成物で，作り方と利用条件の記録がない**）の上に，実画面とサーバーの足場（SVG）を置く．面・線・文字は中立の灰，アクセントは海の青灰 1 色，見出しは 500〜600 の太さで，ヒーローと締めの見出しだけ明朝体．配信中の点灯（緑の小さな点）はヒーローの画面ラベルに **1 つだけ**．**写真の上の文字・ボタン・リンクは，面の色を敷いて読めるようにする**（`heroCaption`・`backLink` と同じ静かな面）．ヒーローのリードは文節ごとに `phrase`（`inline-block`）で包み，語の途中で折り返さない．句読点はサイトの表記（「，」「．」）にそろえる．**CSS は `product.module.css` 一本で，世代ごとの上書きを整理済み**（未使用のクラス・同じセレクタで上書きされた宣言・未使用の変数は取り除いた．足すときは既存の規則を書き換え，末尾へ上書きを積まない）．余白は 4px 格子（12px 以下の偶数の 2px 刻みは可），太さは 400/500/600．**アイコン `public/projects/arkserver.svg` は仮の図案**（アプリ側の正式なアイコンが決まったら，同じパスで差し替える）．**GitHub のリポジトリは `ArkServer` に改名済み**（旧名 `AllServerForMac` は GitHub が転送する．`page.tsx` の `ARK_REPOSITORY` と `apps.ts` の `repositories` を `ArkServer` にそろえてある）．水面の飾り（`waves.tsx`）は，仕組みの図の中だけの静止した波．紹介ページの「次のプロダクト」は `apps.ts` の掲載順（Subghost → BusTimeApp → Ark Server → Tsumugi）で，E2E がその順を確かめる．
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

### 動的 API 層（Cloudflare Pages Functions．`functions/`・`src/lib/edge/`）

本番は静的書き出し（`STATIC_EXPORT=1`）なので，Next の API ルートは存在しない．代わりに，リポジトリ直下の **`functions/api/github/{index,activity,contributions}.ts`** と **`functions/api/music/recent.ts`**（Pages Functions）が同じパスの API を動かす．**ロジックは `src/lib/edge/`（`github.ts`・`appleMusic.ts`・`http.ts`．他を import しない純粋な TS）にあり，`functions/` と Next の API ルート（`src/app/api/...`．`npm run dev` 用）は同じ関数を呼ぶ薄いラッパー**．`wrangler.toml` は**置かない**（置くと Cloudflare ダッシュボードの環境変数が読み取り専用になる）．依存ライブラリも足さない（型は `functions/types.d.ts`）．

- **応答の契約は今までと同じ**：必ず HTTP 200 と `apiStatus`（`success` / `offline` / `rate_limited` / `no_token`．音楽は `token_expired` も）．GET 以外は 405．CORS は付けない．**エラー文・ログに Secret を出さない**．成功は TTL（GitHub のイベント 300 秒・リポジトリ 600 秒・草 1800 秒・音楽 120 秒）でエッジにキャッシュし，**成功以外は 30 秒以内**だけ（一時的な失敗が居座らない）．
- **クライアント**（`githubService.ts`）：静的書き出しでも同じオリジンの `/api/github*` をまず呼び，失敗・404・タイムアウトのときは `src/data/github-snapshot.json` に戻る（オフラインでも崩れない）．イベントのブラウザキャッシュは 10 分．
- **Secret（Cloudflare Pages の環境変数．値はコード・テスト・ドキュメントに書かない）**：`GITHUB_TOKEN`，`APPLE_MUSIC_TEAM_ID`，`APPLE_MUSIC_KEY_ID`，`APPLE_MUSIC_PRIVATE_KEY`（.p8 の PEM），`APPLE_MUSIC_USER_TOKEN`．ローカルは `.dev.vars`（gitignore．キー名だけの `.dev.vars.example` あり）．未設定なら `no_token`．手順は `DEPLOY.md`．
- **Apple Music「最近聴いた曲」**（`RecentMusic.tsx`・`musicService.ts`．Profile セクションの数字の行と年表の間）：Developer Token（ES256 の JWT）を WebCrypto で署名し，`GET /v1/me/recent/played/tracks?limit=5` を Music User Token つきで呼ぶ．**出すのは曲名・アーティスト・アルバム・ジャケット（`*.mzstatic.com` の https だけ）・Apple Music の URL だけで，再生日時・ID は出さない**．取れなかったとき（`success` 以外・空）は**何も描画しない**（エラー文・ダミーを出さない）．ジャケットのため CSP の `img-src` に `https://*.mzstatic.com`（`next.config.mjs` と `public/_headers` の両方）．Music User Token は約 6 か月で失効（`token_expired`）するので，`node scripts/apple-music-user-token.mjs`（ローカルのみ．`127.0.0.1:8787`．トークンはファイルにもログにも出さず画面に表示する）で取り直して Secret を更新する．Apple の応答の形は想定で組んであり（想定外は空に倒す），実際の接続は Secret を入れて確認する．
- テスト：`tests/edge-github.test.mjs`・`tests/edge-apple-music.test.mjs`（`fetch`・時刻・WebCrypto を注入して，署名の検証・整形・apiStatus・Secret が応答に出ないこと・キャッシュの TTL を確かめる）．

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

### 時間で進む展示と，根拠のある文章（自己紹介以降の改良．`docs/references/portfolio-inspiration-research-2026-11-09.md` と `portfolio-ambient-animation-reference.md` が元）

方針は「止めても読めるが，放っておいても進む，作品に由来する小さな展示」．**2026-11-09 にユーザーが「淡々としていて面白くない．要素を詰め込んでほしい」と方向を変えた**ので，章の間の装飾・実験室・触れる展示を足した（下の「要素の詰め込み」）．ただし品質の約束（画面内だけ動かす・止める手段・reduced-motion は静止・粒子数／fps／DPR の上限・実際のものと再現の区別）は守る．**点描の惑星（Hero・ProductShowcase・About の引き継ぎ・ドック・フッター合流）は触らない**．

- **共通部品**（`src/hooks/useTimeExhibit.ts`・`src/lib/exhibitClock.ts`）: 展示を経過時間で進める時計．画面内のときだけ進み，タブ非表示・画面外で止まり，戻ったとき時間を一気に消化しない．**工程を選ぶ・一時停止を押すと自動進行を止める**．`prefers-reduced-motion` は代表フレームの静止＋手動切替．新しい展示を足すときもこの形にそろえる（位置・時間配分は画面に触れない純粋関数にして単体テストを書く）．
- **Skills の「BusTimeApp / 実装の展示」**（`Skills.tsx`・`lib/busProcess.ts`．テスト `tests/bus-process.test.mjs`）: 入力 → 判断（運行日と残り便）→ 結果（「あと8分」）の 10 秒周期．結果を 5 秒保つ．**再現であることを注記**（実際の画面・データではない）．
- **Web Service の「EkiHub 路線図」**（`Works.tsx` の `HubConvergence`・`Works.module.css`・`lib/hubRoutes.ts`．テスト `tests/hub-routes.test.mjs`）: 東京・川崎・船橋から集合候補の新木場へ，点が路線に沿って進む 12 秒周期．説明用に単純化した例であることを注記．実画面（`BrowserFrame`）の下に横長の 1 段で置く（広い画面は図が左，操作と注記が右）．
- **Apps の BusTimeApp の実機録画**（`sections/BusRecording.tsx`・`lib/recordingPlayback.ts`．テスト `tests/recording-playback.test.mjs`）: 既存の `public/projects/bustimeapp-demo-clean.mp4`（約 2MB）を，**パネルが開いている間（`data-open="true"`）かつ画面内のときだけ**再生し，15.1 秒のあと最後の画面を 5 秒保つ．`preload="none"`．カード一覧と reduced-motion は手動再生のみ．poster は既存のスクリーンショット．
- **Apps の「見どころ」（UI の細部を拡大）**（`Projects.tsx` の `AppDetail`・`data/apps.ts` の `focusAreas`・`lib/zoomRegion.ts`．テスト `tests/zoom-region.test.mjs`）: BusTimeApp と Tsumugi の壁のパネルに，番号つきの見どころ各 4 件（画面上の番号の印＋ボタン＋注釈文）．押すと，同じ画像のその領域（0〜1 の割合 `region`）が媒体欄の中央へ拡大される（**transform と opacity だけ・260ms・`var(--site-ease)`**．キーボード起点と reduced-motion は即時．Escape・「全体に戻る」で戻る．戻るボタンは見どころのボタンと同じ列に置き，選んでもパネルの高さが変わらない）．拡大中は BusTimeApp の録画を止める．**強い拡大にするため，領域は幅 0.5 前後以下の「1 つの部品」に絞る**（全幅の帯にすると，細長い携帯画面の枠では幅で倍率が頭打ちになる）．`getZoomTransform` は領域を枠の `ZOOM_FILL`（0.94）に収め，倍率は `ZOOM_MAX_SCALE`（4．元画像の粗さを抑える）で止める．実測で約 2.3〜3.7 倍．領域の周囲は枠で切れてよい（虫眼鏡）．見どころつきの携帯画面のパネルは媒体欄を 42%（ほかは 36%）にして枠を広げている．対象アプリを増やすときは `focusAreas` を足すだけ（領域は画像を目で見て決め，注釈は領域の中に見える文字から言える範囲だけ．番号の印が領域の左上と離れるときは `markerPosition`）．
- **Skills の「見せ方の比較」**（`Skills.tsx`）: BusTimeApp の実画面 2 枚（全時刻表 47 便／次の便「あと8分」）を同じ枠に重ね，**ボタンで切り替える（自動往復・hover 切替にしない）**．opacity の交差だけ・160ms．「改善前後」とは書かない（実装の前後ではない）．
- **M01〜M05（調査資料 8 章）の扱い**: M01（工程の結果部分だけ opacity＋8px・200ms）と M02（路線図の手動選択は点の移動 400ms・強調 200ms）は，既存の展示を仕様に合わせて調整した．M05（押下の沈み込み）は，サイトの規約に合わせて `.press-effect`＝`scale(.95)`・120ms（資料の .98 は採らない）．
- **制作の姿勢の「EVIDENCE」**（`app/page.tsx`・`refinements.css` の `.principle-evidence*`）: 主張を，Subghost（CLI へ送らない監視専用）・Tsumugi（既定の診断は端末内で完結）・BusTimeApp（午前 4 時の運行日境界・共通の判断）の設計判断 3 件と紹介ページへのリンクで裏づける．文は `apps.ts` と各紹介ページで確認できる範囲だけ．
- **GitHub の「最近の制作記録」**（`data/devLog.ts`・`sections/DevLog.module.css`．テスト `tests/dev-log.test.mjs`）: **手動で更新する 3 件**（日付・何が変わったか・使う人への効果）．API が失敗してもモックでも必ず出る静的データ．**git log・差分で確認できる変更だけを書く**．
- **Contact の「相談できること」**（`Contact.tsx`・`ContactIntro.module.css`）: Skills と Hero に既にある主張（Swift・TypeScript・Python・C/Arduino・ゲーム）と既存の連絡方法（メール・GitHub・フォーム）だけ．返信の早さ・料金・対応可否は書かない．
- **Profile セクション（`sections/Profile.tsx`・`Profile.module.css`．`<section id="profile">`．番号 06．Contact は 07）**: GitHub の後ろ・Contact の前．本人の欄（`lg` では上に留まる）・プロフィール欄・データから計算した数字 4 つ（アプリ数・Web とゲームの数・最初の公開時期・言語）・最近聴いた曲・開発の軌跡（`ScrollTimeline`．Apps から移した）・問い合わせへの文字リンク．原点・これから・資格・外部リンクは `PROFILE_FACTS` に値が入ったときだけ．ステータスのバッジは `AvailabilityBadge`（Profile と Contact で共有）．導線は Navbar の About・Contact のドロップダウン，⌘K，フッター，スクロールスパイ（`profile`）．
- **本人情報（プロフィール欄．`data/profile.ts`・`Profile.tsx`・`AvailabilityBadge.tsx`．テスト `tests/profile.test.mjs`）**: Profile セクションの定義リスト `data-testid="profile-specs"`（Name / Education / Focus / Contact．サイトで確認できる事実だけ）．**氏名の漢字・大学名・卒年・所在地・ステータス・SNS・資格は，本人が確認した事実を `PROFILE_FACTS` に入れたときだけ**画面（行・緑点のステータスバッジ・外部リンク・資格の一覧・原点・これから）と JSON-LD の Person（`alternateName`・`alumniOf`・`homeLocation`・`sameAs`）に出る．**空のままなら何も出ない．資料（`docs/profile-information-gaps-and-proposals.md`）の `〇〇`・`202X` などのプレースホルダーや推測（大学名・拠点）を入れない．**バッジの緑点は静止（脈動させない）．
- **About カード 02・年表・Skills の根拠**: About の「iOS / macOS アプリ開発」は，個人開発を本格化した時期・本数・一貫して 1 人で手がけたこと・ソースコードの公開を書く（本数は `SWIFT_APPS.length`）．年表の末尾に「現在」（EkiHub・ブラウザゲーム・ポートフォリオ刷新．作品の作成月は確認できないので月を書かない）．Skills の「技術と，使った場面」に，公開リポジトリで README を確認した **Python（FraTerm）** と **C / Arduino（hackathon_42．赤外線同期の合奏システム）** を足した（AeroPath は説明・README が無く，足していない）．About カード 01・03・04 と年表の「原点」は，本人の経歴・考えの話なので，事実が届くまで書き換えない．
### 動きの磨き込み（2026-11-10．既存の情報表示を，動きで質を上げる）と，取り外した要素

ユーザーの方針：「足した要素が多すぎていらない．欲しいのは，**既存の情報表示をアニメーションで磨いて，Web サイトとしての質を上げること**」．**新しい要素・ページ・装飾は足さない．**指示と基準は `docs/references/codex-motion-polish-common.md`．

- **動きの共通の道具**：`design-tokens.css` の `--ease-out`／`--ease-in-out`／`--ease-drawer`，`--dur-press/fast/base/slow/enter`（120／160／240／420／640ms），`--stagger-step`（50ms）．`src/lib/choreography.ts`（`staggerDelay`・`diagonalDelay`・`splitGraphemes`．テスト `tests/choreography.test.mjs`）．曲線は ease-out を基本に，**`ease-in` と `transition: all` は使わない**．段階表示の遅れは 30〜80ms，全体は 480ms で頭打ち．ホバーは `(hover:hover) and (pointer:fine)` だけ．新しい動きは**必ず同じファイルに reduced-motion の対応**を書く．
- **磨いた場所**：Skills（カードの中身が視線の順に出る・アプリ棚・数字・配線・技術チップの強調と使用例の切り替え），Apps（パネルが開いたときの文の順次表示・見どころの印・タイルの触り心地・切替の面が滑る），Works（強調語の下線・実画面の起き上がり・視差），GitHub（リポジトリカードの斜めの波・追加カード・草の列ごとの波・活動の行），Profile（名前・罫線が順に引かれる・数字・年表の節目），Contact（入力欄のフォーカス・エラーの揺れ・コピー完了の入れ替え），全体（`Reveal` の曲線と時間・見出しの順序・ナビのメニューの開き方・制作の姿勢の 90ms の点灯・ページ遷移 240／320ms）．**Codex の利用上限で一部が途中で打ち切られたため，動きの細部（時間・遅れ・連打時の挙動）は実機で確かめきれていない**．
- **取り外した要素（`src/config/features.ts` のスイッチ．すべて false．コードは残してある）**：`lab`（実験室 `/lab`）・`notes`（制作ノート `/notes`）・`skillLab`（Skills の実装の展示室）・`evidence`（制作の姿勢の EVIDENCE）・`devLog`（GitHub の最近の制作記録）・`contactIntro`（Contact の相談できること）．`/lab`・`/notes` のページは `src/disabled/lab`・`src/disabled/notes` へ移してある（Next のルートにならない）．**戻すときは，それらを `src/app/` へ戻し，スイッチを true にする**（ナビ・⌘K・sitemap・ホームの予告は，スイッチに追随する）．E2E もスイッチに合わせて期待値が変わる．
- **まだ残している追加**（取り外しの対象に選ばれなかった）：章の間の装飾（`components/ambient`），Apps の索引・メタ行・閲覧モード切替・次の作品の理由，Profile セクション．

### 魅せ方の追加（2026-11-10．lusion.co/projects の考え方を借りる）

ユーザーの線引き：**足したくないのは「本人についての情報・文章」だけ．アニメーションと魅せ方は積極的に足してよい．**お気に入りは lusion.co/projects（見た目・コード・書体は写さない）．実装は Sonnet のサブエージェントに分担させた．純粋関数は `src/lib/animations/`（各ファイルは他を import しない），部品は `src/components/animations/`，テストは `tests/anim-*.test.mjs`・`tests/route-transition.test.mjs`．

- **作品タイル**（`/apps/others`・Works の EkiHub・`/games`）：大きな角丸の画面＋小さな分類の行＋大きな題名．ホバー／フォーカスで題名の文字が回り（`animations/RollTitle`），画面の中身だけが枠の中で 1.05 倍に寄る．スクロールの速さで画面がしなる（`animations/ScrollBend`・`lib/animations/scrollBend.ts`．最大 ±4°・1.04 倍・ばね 0.35 秒．スクロール購読と rAF はページで 1 本．`/games` は横送りなので付けない）．カーソルの「VIEW」の札は既存の `CursorRing` の `data-motion-work`．`/apps/others` の h2 は E2E の正規表現のため `sr-only` の平文で，見える題名は `aria-hidden` の `RollTitle`．
- **見出しの「大きな語＋件数」**（`SectionHeading` の `count`・`size="display"`．`SectionHeading.module.css`）：Apps（`SWIFT_APPS.length`）と Works（`ALL_WORKS.length`）だけ．件数は h2 の外の兄弟で，見出しの登場に合わせて数字が縦に回る（CSS だけ）．**Apps の固定表示（`[data-pin]`）では語の大きさを `5.2svh` で抑える**（大きくすると紹介パネルの下が切れる）．
- **流体タブ**（`animations/liquid/LiquidTabs`．スイッチ `FEATURES.liquidTabs`）：Apps の「順に見る／一覧で見る」．雫 2 つをばね（0.28 秒／0.42 秒）で動かし，動いている間だけ SVG フィルタを掛ける．キーボードと reduced-motion は即時．
- **分解ビュー**（`animations/exploded/ExplodedView`．スイッチ `FEATURES.explodedView`）：`focusAreas` を持つアプリ（BusTimeApp・Tsumugi）のパネル右上の「分解」ボタン．実画面が 4 層（背面・画面・見どころの枠・ラベル）に離れ，マウスに合わせて傾く．見どころの拡大と排他，分解中は録画を止め，パネルが閉じたら戻す．キーボード起点と reduced-motion は 3D を使わず層を重ねるだけ．
- **紹介ページへの遷移**（`ProductMorph.tsx`・`NavigationTransitions.tsx`・`lib/transitionEffects.ts`・`motion.css`）：押した画面が 480ms（`--ease-in-out`）で育って移動先の画面になる．古いページは 200ms で退き，新しいページの残りは 240ms 遅れて現れる．「← アプリ一覧」で戻るとき（固定表示の壁のときだけ）は逆向き．ブラウザの戻る・EkiHub の戻りは従来どおり．**遷移は `NavigationTransitions` が `startViewTransition` を直接呼ぶ**（`PageTransition` はただの div．上の「画面の切り替え」の `<ViewTransition>` の記述は古い）．見出し・カードの共有（`data-morph-title`・`data-morph-surface`）はやめた．
- **Lusion のトップ由来の追加（2026-11-11．スイッチはすべて `features.ts`．共通の指示は `docs/references/sonnet-brief-common.md`）**：
  - `fluidCursor`：カーソルの動きに合わせて淡い光が流れて薄れる（`animations/fluid/`・`lib/animations/fluid.ts`．素の WebGL2．three は使わない）．**方式は lusion.co を解析して合わせた：流体の方程式は解かない．画面の 1/4 の解像度の「塗りのバッファ」（xy＝速度，zw＝薄れる速さの違う 2 つの重み）に，マウスの線分を筆（半径は 1 コマの移動量に比例）で塗り，ぼかした自分の速度と勾配ノイズで少し流し，毎コマ一定の割合で薄れさせる．表示は，速度を RGB で位相の違う正弦に通した色を背景へ足す（正は明るく，負は淡い色の筋）**．1 コマ 4 パス（更新・ぼかし 2・表示）で軽い．ヤコビ反復などの流体の計算・ページの歪み（backdrop-filter）は，重くて色味も合わなかったので削除した（戻さない）．背景が白に近いので「背景より白い光」は出にくく，水色〜紫の淡い面と筋になる．数値は `fluid.ts` の定数（参考の値から変えた所は理由つき）．本文の上に通常のアルファ合成で重ねる．PC のマウスだけ・幅 761px 以上・reduced-motion とタッチでは出さない・紹介ページ（`/apps/<app>/`）では出さない．最初のマウスの動きで読み込み，止まると約 1.4 秒でなだらかに薄れて rAF を止める．自動操作で撮るときは 16ms 間隔で連続して動かす．
  - `strokeCurves`：章の間を横切る太い曲線（`animations/StrokeCurve`．Skills→Apps・Works→GitHub・Contact の前．スクロールに 1:1 で `stroke-dashoffset`）．その場所の点の帯（`DotWaveDivider`）は置き換え（testid は残す）．
  - `spreadWords`：Contact の前の 4 語が，詰まった状態から両端へ広がる（`animations/SpreadWords`．`VelocityMarquee` を置き換え）．
  - `cornerMarks`：画面の枠の四隅の「＋」の印（`animations/CornerMarks`．Works の EkiHub・`/games`・`/apps/others` はホバー中だけ）と，点から円が広がって塗られる丸いボタン（`animations/DotPillLink`．ゲームへの案内・その他のアプリへの誘導）．
  - `growingReel`：`/apps/bustimeapp` の録画の枠が，固定表示の最初の 70vh で 0.38 倍から等倍へ育つ（`demo-scene.tsx`・`lib/animations/growingReel.ts`．CSS の `--reel-grow` と定数をそろえる）．右の列で育つ（中央・全面ではない）．
  - 見送り：スクロールで奥へ進む 3D の世界，慣性スクロール，ヒーローの 3D，背景の明→暗の切り替え．
- 見え方の確認は，拡張の Chrome（動きを減らす設定で描画が止まる）ではなく，**ヘッドレス Chrome を CDP で操作して撮る**（`.click()` はキーボード扱いになるので，マウスは `Input.dispatchMouseEvent`．スクロールは `behavior:'instant'`）．

### 要素の詰め込み（2026-11-09．`docs/references/` の調査資料の P01〜P28・I01〜I06・L01〜L20 から）

Codex に分担させて作った．共通の指示は `docs/references/codex-brief-common.md`，参考の公開 README は `docs/references/source-readmes/`（hackathon_42・FraTerm・公開リポジトリ一覧）．**新しい npm 依存は足さない**（Canvas 2D・SVG・CSS・WAAPI だけ）．

- **共通フック `src/hooks/useCanvasLoop.ts`**（Canvas 展示はすべてこれ）：画面内（一部でも）かつタブが見えている間だけ描く／戻ったとき止まっていた時間を消化しない／reduced-motion は代表フレーム 1 枚／`maxDpr`・`maxFps` の上限／`paused`・`redraw`・`seek`．DOM の工程展示は `useTimeExhibit`．
- **章の間・余白の「生きている面」**（`src/components/ambient/`・`src/lib/ambient/`．テスト `tests/ambient-*.test.mjs`）：`DotWaveDivider`（点の帯．`swell`／`ripple`／`rain`．Skills→Apps，Apps の帯の後，Works→GitHub，GitHub→Profile に置いた），`StatementBand`（スクロールで 1 語ずつ濃くなる短い帯．**文言は `lib/ambient/statement.ts` の `STATEMENT_EXAMPLES`．数は `SWIFT_APPS.length`・`ALL_WORKS.length` から**），`AmbientMesh`（Profile の背景），`LightRays`（Contact の背景），`LiquidSignature`（Contact 直前の「RH」．文字の中だけ縞が流れる），`SectionOrnament`（未配置）．すべて `aria-hidden`・操作を通す．背景に置く親は `position:relative; isolation:isolate`，本文は `position:relative; z-index:1`（Profile・Contact は設定済み．**`overflow:hidden` を親に付けない**．Profile の本人欄の `sticky` が効かなくなる）．
- **実験室 `/lab`**（`src/data/lab.ts`・`src/app/lab/page.tsx`・`src/sections/lab/`・`src/lib/lab/`・`LabTeaser`．テスト `tests/lab-*.test.mjs`）：点の波・点の軌道・命の遊び（Game of Life．静止したら再投入）・情報片が集まる（boids）・つながる塊・煙の環・渦・点の文字・布のポスター（Verlet）・流れの場・水面の波紋・リサジュー・星座・液体金属の RH・光線の 15 個．**製品と混ぜず，状態バッジ（試作／継続中／公開）を付ける**．ホームの Works の下に `LabTeaser`（3 つのコンパクトなプレビュー）．カード内の `overflow:auto` の縦スクロールバーは `scrollbar-width:none` で隠してある（macOS の常時表示だと濃い帯が出るため）．
- **制作ノート `/notes`**（`src/data/notes.ts`・`src/app/notes/`・`src/sections/notes/`・`src/lib/notes/`・`NotesTeaser`．テスト `tests/notes-*.test.mjs`）：「課題→制約→判断→動く図→確かめたこと→関連→根拠」の 6 本（惑星の引き継ぎ・集合駅の公平さ・午前 4 時の運行日境界・診断を端末内で完結・CLI へ送らない監視・公開前の検証）．**根拠のファイルを各記事に載せ，テストで存在を確かめる**．静的書き出しのため `generateStaticParams` で全 slug を列挙・`dynamicParams = false`．図は手動操作（説明用の固定サンプル・簡略化した説明図と明記）．sitemap・Navbar（About）・⌘K・ホームの `NotesTeaser`（Profile の前）に載る．
- **Skills の「実装の展示室」**（`src/sections/skillLab/`・`src/lib/skillLab/`．テスト `tests/skill-lab-*.test.mjs`）：`BusProcess` の直後．C / Arduino（hackathon_42 の赤外線輪唱の**再現**．BPM・SYNC 欠落からの回復）・Python（FraTerm の 4 モードの**再現**．合成映像を文字へ）・Web（EkiHub の集合駅の比較．**説明用の固定データ**）・Tsumugi（情報を編む**比喩**）の 4 タブ（WAI-ARIA）．選ばれていない展示は描画も時間更新も止める．
- **Apps の索引・メタ・閲覧モード・回遊**（`CapabilityIndex.tsx`・`data/capabilities.ts`・`data/publicRepos.ts`・`lib/appMeta.ts`・`lib/capabilities.ts`・`lib/nextProduct.ts`）：「できることから探す」チップ（根拠は `apps.ts` の tags／説明にある語だけ．テストで全語の存在を確認），メタ行（OS・時期・個人開発・ソース公開．**公開状態は `publicRepos.ts`（公開リポジトリ名．生成日つき）に名前がある作品だけ**），閲覧モード「順に見る／一覧で見る」（固定表示が使える画面だけ．選択は `sessionStorage`．「一覧」は固定スクロールを使わない），紹介ページ末尾の「次の作品」に理由の一行（共通のタグ・プラットフォームの違いから計算）．

- 見送り（理由つき）: About への実例追加（惑星の着地点がカードの位置と連動するため．素材の本人の写真・制作ノートが揃ってから），章の間の点の波（優先度が低い）．

### Apple デザインの細部（`DESIGN-apple.md` を反映）

トークンと細部を Apple の設計書にそろえている（`design-tokens.css`）．**新しい部品を足すときも守ること**．

- **青は 1 色だけ**: 操作できるものは `--site-accent`（#0066cc．ダークは #2997ff）．キーボードの輪郭だけ `--site-focus`（#0071e3．ダークは #2997ff）の 2px（`globals.css` の `:focus-visible` も同じ青）．主な行動は Action Blue のピル（Hero の `.cta`・`.portfolio-primary`．17px / 400，11px × 22px，押すと `scale(.95)`）．
- **影は製品の画像だけ**: `--site-shadow-card` は `none`（カードは面の色の差と 1px の細い線 `--site-line` で分ける）．影を付けてよいのは，アイコンや画面が面に置かれているときの `--site-shadow-product`（`3px 5px 30px rgba(0,0,0,.22)`）だけ（Hero のアプリ棚，Apps の壁のタイルと画面）．ナビゲーションにも影は付けない．
- **ナビゲーションはすりガラス**: 背景 80% + `saturate(180%) blur(20px)`（メニューを開いたときは 94%）．
- **文字の太さは 300 / 400 / 600 / 700 だけ（500 は使わない）**: 小さなラベル・等幅は 400，見出し・強調は 600．見出しは 600（650 や 700 にしない．Hero の h1 とフッターの名前の 700 は例外）．**製品ごとの紹介ページ（`/apps/<app>/`）は各ページで配色・書体を完結させているので，この対象に含めない**．
- **色は中立の灰**: 線 #e0e0e0（ダークは #38383a），補足の文字 #6e6e73（ダークは #aeaeb2）．ダークの面は `--site-surface-soft` #1d1d1f，`--site-surface-raised` #272729（Apple の暗いタイル）．
- **押せる大きさは 44px 以上**．押したときの沈み込みは，どのボタンも `scale(.95)`（`.press-effect`）．
- 未適用（プロジェクトの約束事と衝突するため）: カードの角丸 28px（設計書は 18px），アイコンチップの淡いグラデーション，ヒーロー背景のグラデーション，`shadow-soft` の Tailwind 影，本文 17px．変えるときは先に相談すること．

### アクセシビリティの約束事

- 冒頭に「本文へスキップ」リンク（`.skip-link`）を置き，`<main id="main-content">` へ飛ばす．
- フォーカスリングは `globals.css` の `:focus-visible` で一括指定．`outline: none` を個別に書かない．
- Apps の壁は，各タイルに「〇〇を大きく見る」ボタン（固定表示のときだけ出る．押すとそのアプリまでスクロールする．いま表示中のものは `aria-current`）を持ち，紹介パネルの中身は育っていないあいだ `visibility:hidden`（フォーカスも読み上げも受けない）．表示中のアプリは `role="status"` の領域でも伝える．
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

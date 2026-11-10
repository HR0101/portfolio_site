# Sonnet への共通指示：Lusion 風の魅せ方の追加（2026-11-11）

対象は /Users/Rhara/portfolio_site（個人ポートフォリオ．Next.js 16 App Router + TypeScript + Tailwind v4．アニメーションの依存ライブラリなし）．返答・コメントは日本語（です・ます調．句読点は「，」「．」）．

## ユーザーの意向
- 「本人についての情報・文章は足したくない．アニメーションと魅せ方は積極的に足してほしい」．お気に入りは https://lusion.co/ ．**見た目・コード・書体・画像は写さず，考え方だけを借りる．**新しい説明文・主張は書かない（「見る」「再生」「View」程度の UI の語は可）．文言・数値・リンク先は既存のデータ（`src/data/*`）から．

## 絶対に守ること
- **触らない**：`src/sections/Hero.tsx`・`Hero.module.css`・`About.*`・`ProductShowcase.*`，`src/components/DotPlanet.tsx`・`PlanetTail.tsx`・`HeroUniverse*`・`FooterMotion.tsx`・`CursorRing.tsx`（読むのは可），`src/lib/sharedPlanet.ts`・`planetTail.ts`・`cardParticles.ts`・`wordmark*`・`planetPoints.ts`・`particleWordmarkCanvas.ts`・`appWall.ts`・`zoomRegion.ts`，`src/lib/edge/*`，`functions/*`，`src/disabled/`，`src/config/features.ts`（スイッチは用意済み．読むだけ），`package.json`，`CLAUDE.md`．
- **同時に 4 人が別々の範囲を編集している．自分の担当表に無いファイルは編集しない**（必要なら報告に書く）．
- スイッチ：担当の機能は `FEATURES.<名前>`（`src/config/features.ts`．既に true で定義済み）で囲み，false のとき今の画面・HTML に戻ること．
- 動かすのは `transform`・`opacity`・`clip-path`（SVG の線は `stroke-dashoffset` 可）だけ．**`ease-in` と `transition: all` は禁止**．曲線・時間は `src/app/design-tokens.css` のトークン（`--ease-out`・`--ease-in-out`・`--dur-press/fast/base/slow/enter`）．ホバーは `@media (hover: hover) and (pointer: fine)` の中だけ．`:focus-visible` にも同じ水準の返事．
- 新しい動きは，**同じ CSS に `@media (prefers-reduced-motion: reduce)` の対応**（移動・拡大をやめ，完成した静止の姿を出す）．JS 側は `src/hooks/usePrefersReducedMotion.ts`．
- スクロールを見るときは `src/lib/scrollObserver.ts` の `subscribeToScroll` か `src/hooks/useScrollLinked.ts`（**window に scroll リスナーを張らない**）．自分が動かす要素の位置を測らない（計測用の外側と変形用の内側を分ける）．rAF の中で `getBoundingClientRect` を呼ばない．React の state を毎フレーム更新しない．
- `.reveal` に `translate`/`transform` を当てない（`CursorRing` の引力と `Reveal` が使う）．
- 装飾は `aria-hidden`・`pointer-events: none`．検索・読み上げ・E2E が見る既存の文字列・属性（`tests/e2e.test.mjs` を grep して確認）を消さない．レイアウトのずれ（CLS）を起こさない．
- デザインの約束（`CLAUDE.md` の「Apple デザインの細部」）：操作できる色は `--site-accent` 1 色，文字の太さは 300/400/600/700，押せる大きさは 44px 以上，押下は `.press-effect`．ライト／ダーク両対応．
- 依存を足さない．**`three` を import しない**（WebGL が要るなら素の WebGL）．Web フォントを足さない．
- 規約：インデント 2，camelCase，コメントは日本語，数値は名前つきの定数，エラーハンドリング，ESLint 警告ゼロ．Next.js 16 の書き方は迷ったら `node_modules/next/dist/docs/` を読む．
- 純粋に計算できる部分は `src/lib/animations/<名前>.ts`（**他ファイルを import しない自己完結**）にして，`tests/anim-<名前>.test.mjs`（`tests/choreography.test.mjs` と同じ，TS を data: URL で読み込む方式）を書き，`node --test` で通す．`package.json` への登録はこちらでやる．
- **`npm run build`・`npm run check`・`npm test` は実行しない**（開発サーバー :3001 が動いている．再起動もしない）．実行してよいのは `npm run typecheck`・`npx eslint <変えたファイル>`・`node --test tests/<自分のテスト>`．
- git の commit・stash・checkout・reset はしない（未コミットの変更が大量にある．他人の変更を戻さない）．

## 見た目の確認のしかた（推奨）
拡張の Chrome は「動きを減らす」設定で描画も止まるので使えない．**ヘッドレス Chrome を CDP で操作して撮る**．雛形は `/private/tmp/claude-502/-Users-Rhara-portfolio-site/ce17ff72-4b0e-4aff-b64a-bccf57625216/scratchpad/shoot.mjs`（`node shoot.mjs <url> <名前> <手順>…`．手順は JS の式／`mouse:x,y`／`click:x,y`．各手順のあとに `shots2/<名前>-<n>.jpg` を撮る）．**自分用に複製し，`PORT`・`user-data-dir`・出力先の名前を変えて使う**（他の担当と衝突するため）．スクロールは `scrollTo({top, behavior:'instant'})`．`element.click()` はキーボード扱いになるので，マウスは `click:`／`mouse:` を使う．撮った画像は自分で開いて確かめ，おかしければ直す．

## 最終報告
変えた／作ったファイルと要点，動きの一覧表（要素・いつ・何が動く・時間かばねの値・曲線・reduced-motion の扱い），既存の仕組みと競合しない根拠，実行した確認（撮った画面で何を見たか），**実行できなかった確認を正直に**，迷って決めた点．

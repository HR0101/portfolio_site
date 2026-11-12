# Codex への共通指示（2026-11-09．今回の「要素を詰め込む」作業用）

作業ディレクトリは /Users/Rhara/portfolio_site（Next.js 16 App Router + TypeScript + Tailwind v4，ブランチ codex/portfolio-polish．変更は未コミットで，**他の Codex エージェントが別の機能を同時に作っている**ので，下の「触ってよいファイル」以外は編集しないこと．編集前に必ず対象ファイルを読み直し，他の人の変更は戻さない）．最初にプロジェクト直下の `CLAUDE.md` を全部読み，次に `docs/references/portfolio-inspiration-research-2026-11-09.md` と `docs/references/portfolio-ambient-animation-reference.md` を読むこと．

# 全員に共通の背景と方針（今回の方向転換）
ユーザーは「サイトが淡々と表示しているだけで，何も面白くない．参考資料（上の 2 つの md）を見て，できる限り要素を詰め込んでほしい．コストは考えなくていい」と言っている．これまでは「装飾の粒子や常時浮遊は足さない」という控えめな方針だったが，**今回はそれを覆す．各展示は，見て・触って「おっ」となる，遊べる・驚きのあるものにする．**ただし次の品質の約束は守る（資料の「実装するときの共通条件」）：
- 時間（またはポインタ・キー入力）で進める．**画面内かつタブが見えている間だけ**動かし，戻ったとき止まっていた時間を一気に消化しない．**止める手段（一時停止ボタン．押せる大きさは 44px 以上）**を付ける．`prefers-reduced-motion` では**代表フレーム 1 枚の静止＋手動操作**にする．本文・リンク・重要な数値は静止させる．
- DOM の動きは `transform` / `opacity` 中心．毎フレームの React state 更新をしない（Canvas や DOM に直接書く）．粒子数・描画解像度・fps に上限を設ける（低性能でも重くならない）．
- **Canvas の展示は，既にある共通フック `src/hooks/useCanvasLoop.ts`（読んで使う．変更しない）で作る**．DOM の工程展示は `src/hooks/useTimeExhibit.ts` と `src/lib/exhibitClock.ts`（既存．読む）．
- 位置・時間配分・物理・生成などのロジックは `src/lib/` の**純粋関数**にして（DOM・乱数は注入．乱数は決定論的な擬似乱数 `mulberry32` 等を自前で）**単体テスト**を書く（`node:test`．TS は data: URL 経由で読み込む既存テストと同じ方式．例 `tests/bus-process.test.mjs`・`tests/hub-routes.test.mjs` を見る．**テスト対象は他ファイルを import しない自己完結**）．
- **事実をでっちあげない．実際のものと，再現・実験・説明用の簡略化は，画面上で必ず区別して書く**（例「再現です」「説明用の固定データです」「実験です」）．ライブの利用者位置・実測値に見せない．
- デザイン：Apple の細部（`CLAUDE.md`「Apple デザインの細部」）．白黒基調・`--site-*` トークン・ライト／ダーク両対応・文字の太さは 400 / 600・押せる大きさ 44px 以上・押すと `scale(.95)`（`.press-effect`）．**展示の「面」の中では，実験にふさわしい強い見た目（暗い面・白い点・アプリの色）を使ってよい**が，サイト共通の操作色（青）は変えない．影は製品の画像だけ．キーボード操作・`aria` ラベル・フォーカスリング（`globals.css` の `:focus-visible`）を必ず．
- 文は「です・ます調」，句読点は「，」「．」．コーディング規約：インデントはスペース 2 つ，camelCase，**コメントは日本語**，**マジックナンバーは定数に**，エラーハンドリング．ESLint は警告ゼロ．1 ファイルが肥大化するなら分ける（目安 400 行）．CSS は新規の CSS モジュール．**`.reveal` に `translate` を当てる CSS を書かない**（CursorRing の引力と競合する）．
- **点描の惑星まわりを一切触らない**：`Hero.tsx`，`About.tsx`／`About.module.css`，`ProductShowcase.tsx`／`ProductShowcase.css`，`DotPlanet.tsx`，`PlanetTail.tsx`，`lib/sharedPlanet.ts`／`planetTail.ts`／`cardParticles.ts`／`wordmark*`／`planetPoints`，`HeroUniverse*`，`particleWordmarkCanvas`．完成済みの `lib/appWall.ts`・`lib/zoomRegion.ts`・`lib/edge/*`・`functions/*` も触らない．
- **新しい npm 依存を足さない**（この環境はネットワークが無い．`npm install` できない）．three.js や GSAP は使わず，**Canvas 2D・素の WebGL・SVG・CSS・WAAPI** で作る．
- **`npm run build` / `npm run check` / E2E は実行しない**（開発サーバー :3001 が動いている）．自分のテスト（`node --test tests/<自分のファイル>.test.mjs`）・`npm run typecheck`・自分のファイルへの ESLint（`npx eslint <ファイル>`）は実行してよい．
- **共有ファイルは編集しない**（他のエージェントと衝突するため）：`src/app/page.tsx`，`src/components/Navbar.tsx`，`src/components/CommandPalette.tsx`，`src/components/Footer.tsx`，`src/app/sitemap.ts`，`package.json`，`tests/e2e.test.mjs`，`CLAUDE.md`，`src/app/globals.css`，`src/app/refinements.css`，`src/app/design-tokens.css`，`src/app/layout.tsx`，`src/sections/Profile.tsx`，`src/data/apps.ts`（D 以外），`src/data/works.ts`．**これらに必要な変更は，最終報告の「統合メモ」に書く**（どのファイルのどこに何を足すか．import パス・export 名・props・推奨の差し込み位置・`data-testid`・sitemap に足す URL・⌘K／ナビの文言・package.json の `test` / `test:motion` に足すテストファイル名）．統合はこちらで行う．
- 新しいテストファイルは，`package.json` の `test` / `test:motion` に**こちらで**足す（あなたは触らない）．

# 最終報告に必ず入れること
1. 変更・新規ファイルの一覧と要点 2. **統合メモ**（上記） 3. 画面に出る内容の説明（展示ごとに，何が動き，何を操作でき，何を再現・実験と明記したか） 4. 実行したテスト・tsc・ESLint の結果，**実行できなかった確認**（ブラウザでの見え方・実機の滑らかさは未確認，など）を正直に．

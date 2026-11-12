# Codex への共通指示：既存の情報表示を，動きで「Web サイトとしての質」へ引き上げる（2026-11-09）

## 今回の目的（最重要）
ユーザーの言葉：「**変な，いらない要素が多数追加されている．僕が欲しいのは，既存の情報表示をアニメーションを使って，Web サイトとしてのクオリティを上げてほしい**」．
直前の作業で，実験室・制作ノート・展示室などの**新しい要素を足しすぎて**不評だった（それらは取り外し済み）．今回は逆に，**足さない．すでに画面にある情報（文字・カード・数字・図・画像・リンク・一覧）の「現れ方・切り替わり方・触ったときの返事」を，丁寧に設計し直す．**

### 絶対に守ること
1. **新しい要素・新しいページ・新しいセクション・新しい文言・新しい装飾（粒子・Canvas・グロー・背景の模様・アイコン）を足さない．** 画面に出ている情報は，いまのものと**同じ**．足してよいのは，既存の文字・図形を動かすための**ラッパーの `span`／`div`**（文字を分けて出す，マスクで出す，など）と，既存の要素のための `::before`／`::after` の**細い線・下線・ハイライトの面**（ホバーで引かれる下線など）だけ．
2. **動きの目的を 1 つずつ名指しできること**（フィードバック／空間のつながり／状態の変化の可視化／唐突な変化をなだらかにする／仕組みの説明）．名指しできない動きは入れない．**頻度が高いもの（ナビ・⌘K・ホバー）は速く控えめに．初めて見る瞬間（セクションの登場）には，手をかける．**
3. 変えるのは「登場」「状態の切り替え」「ホバー・押下・フォーカスの返事」「スクロールに連動する進み具合」だけ．**文章・数値・リンク先・レイアウトの構造は変えない**（動きのために必要な `position`/`overflow` の調整は可．レイアウトのずれ＝CLS を起こさない）．
4. **点描の惑星まわりを一切触らない**：`Hero.tsx`・`Hero.module.css`・`About.tsx`／`About.module.css`・`ProductShowcase.tsx`／`.css`・`DotPlanet.tsx`・`PlanetTail.tsx`・`lib/sharedPlanet.ts`／`planetTail.ts`／`cardParticles.ts`／`wordmark*`／`planetPoints`・`HeroUniverse*`・`particleWordmarkCanvas`・フッターの名前の粒子（`Footer*`）．完成済みの `lib/appWall.ts`（壁の位置計算）・`lib/zoomRegion.ts`・`lib/edge/*`・`functions/*` も触らない．`src/disabled/`・`src/config/features.ts`・`src/components/ambient/` も触らない（取り外し／保留中）．

## 動きの設計の基準（Emil Kowalski の考え方に沿う．`.claude/skills/animate`・`emil-design-eng`・`apple-design`・`choreograph` の SKILL.md も参照してよい）
- **曲線は共通トークン**（`src/app/design-tokens.css`．先に読む）：登場・退場は `var(--ease-out)`（`cubic-bezier(0.23, 1, 0.32, 1)`），画面内の移動・変形は `var(--ease-in-out)`，シート・ドロワーの滑りは `var(--ease-drawer)`，色・不透明度だけの変化は組み込みの `ease`，一定速度（進捗・マーキー）は `linear`．**`ease-in` は使わない．`transition: all` も使わない**（プロパティを名指しする）．
- **時間**：押した反応 `--dur-press`（120ms）／ホバー・色・小さな変化 `--dur-fast`（160ms）／標準の切り替え `--dur-base`（240ms）／大きな面の切り替え `--dur-slow`（420ms）／セクションの登場 `--dur-enter`（640ms）まで．UI の状態変化は 300ms を超えない．**段階表示の遅れは 30〜80ms／項目（`--stagger-step`＝50ms．JS では `src/lib/choreography.ts` の `staggerDelay`・`diagonalDelay`）．全体の遅れは 480ms で頭打ち**（読む前に待たせない）．
- **動かすプロパティは `transform`・`opacity`・`clip-path`（マスクで出す）だけ**（アコーディオンの高さは既存の `grid-template-rows` 方式を使う）．`width`/`height`/`top`/`left`/`margin` を動かさない．**`scale(0)` から始めない**（`scale(.94〜.97)`＋`opacity:0` から）．ポップオーバー・メニューは `transform-origin` を起点に置く（モーダルは中央）．移動量は，要素自身の大きさに対する `%` を優先（固定 px を避ける）．
- **状態が行き来するもの（タブ・トグル・ホバー・展開）は CSS の `transition`**（途中で逆向きにしても現在値から戻る）．**`@keyframes` は，一度だけ再生する登場に使う**．連打できるものにキーフレームを使わない．
- **ホバーは `@media (hover: hover) and (pointer: fine)` の中にだけ書く**（タッチの偽ホバーを避ける）．押した沈み込みは `.press-effect`（`scale(.95)`）を使う（既存）．**キーボード操作のフォーカスにも，ホバーと同じ水準の返事**（`:focus-visible`）．
- **`prefers-reduced-motion: reduce`**：移動・拡大縮小・回転をやめ，**不透明度の短い変化（〜160ms）か，即時表示**にする．**新しく書く動きは，必ず同じファイルの `@media (prefers-reduced-motion: reduce)` に対応を入れる**．JS で動かすものは `usePrefersReducedMotion`（`src/hooks`）か `matchMedia` を見る．
- **スクロール連動は `src/lib/scrollObserver.ts` の `subscribeToScroll`（全体で 1 本）を使う**（個別に `addEventListener('scroll')` を張らない）．登場の合図は既存の `Reveal`／`useInView`（`IntersectionObserver`）．毎フレームの React の state 更新をしない（CSS 変数・`style` の直接書き込み）．
- **既存の仕組みと競合しない**：`.reveal` に `translate` プロパティを当てない（`CursorRing` の引力が使う）．`.reveal` の `transform` を別の規則で上書きしない．`ProductMorph`（`data-morph-*`）・View Transitions・`SectionTransitions`（`data-scroll-actor`）・`TiltCard`・`SpotlightCard` の挙動を壊さない．**1 つの要素の `transform` を複数の仕組みで奪い合わない**（必要なら内側／外側の要素を分ける）．
- 文字を分けて出すときは，**元の文字列を `sr-only` で別に置き，分けた側を `aria-hidden`**（既存の `SplitTextReveal`・`PhraseReveal`・`KineticText` と同じ形）．既存の部品を**まず再利用**する．
- 数字が動くもの（数え上げ・桁が回る）は，既存の `RollingNumber`・`AnimatedCounter`・`useCountUp` を再利用し，**最終値が最初から読み上げ・検索に残る**こと（`aria-label` か `sr-only`）．

## 作業の進め方
1. **担当範囲のファイルと，そこに出ている情報を先に全部読み，いまの動き（どこに何の動きが既にあるか）を棚卸しする．**既にある良い動きは壊さず，足りない所・唐突に切り替わる所・全部が同時に出て「ただ表示されている」所を直す．
2. 各セクションに「**登場の振り付け**」（何がどの順で，どの方向から，どれだけずらして出るか）を決めて実装する．見出し→説明→主役→補助，のように**視線の順**に出す．同じ種類の項目は同じ動き，違う役割の項目は違う動き（全部同じ `fade-up` にしない）．
3. **操作できるもの（ボタン・タブ・リンク・カード・入力）は，ホバー・押下・フォーカス・選択・切り替えの全部に返事を付ける**．切り替わるものは，瞬時に差し替えず，旧 → 新の橋渡しを付ける（交差フェード，スライドする下線，位置が滑る強調）．
4. 純粋に計算できる部分（遅れの配分・進捗の変換・順序）は `src/lib/` の純粋関数にして，`tests/` に **node:test の単体テスト**を書く（TS を data: URL 経由で読み込む既存テストと同じ方式．例 `tests/choreography.test.mjs`・`tests/zoom-region.test.mjs`．**テスト対象は他ファイルを import しない自己完結**）．新しいテストファイルは，`package.json` の `test`／`test:motion` に**こちらで**足す（あなたは触らない）．
5. 動きの調整がうまくいったかは，**数値（時間・遅れ・移動量・曲線）を最終報告に書く**（こちらで画面確認する）．

## 技術・規約
- Next.js 16 App Router + TypeScript + Tailwind v4．**依存ライブラリは足さない**（ネットワークが無い．Framer Motion 等は使わない．CSS・WAAPI・自作フックで）．
- コーディング規約：インデントはスペース 2 つ，camelCase，**コメントは日本語**，**マジックナンバーは定数に**（時間・距離・遅れ），エラーハンドリング．ESLint は警告ゼロ．文は「です・ます調」，句読点は「，」「．」（新しい文言は足さないので原則不要）．
- **`npm run build` / `npm run check` / E2E は実行しない**（開発サーバー :3001 が動いている）．`node --test tests/<自分のファイル>.test.mjs`・`npm run typecheck`・`npx eslint <自分のファイル>` は実行してよい．
- **共有ファイルは担当者だけが編集する**（下の担当表）．担当外のファイルを編集しない．必要な変更は報告に書く．
  - 担当表：**Skills**＝`sections/Skills.tsx`・`Skills.module.css`・`SkillExamples.tsx`・`SkillExamples.module.css`／**Apps**＝`sections/Projects.tsx`・`Projects.module.css`・`CapabilityIndex.*`・`app/apps/others/*`／**Works・GitHub**＝`sections/Works.tsx`・`Works.module.css`・`GitHubActivity.tsx`・`DevLog.module.css`・`components/ContributionTooltip.tsx`／**Profile・Contact**＝`sections/Profile.tsx`・`Profile.module.css`・`Contact.tsx`・`ContactIntro.module.css`・`ContactMotion.css`・`components/AvailabilityBadge.*`・`CopyEmailButton.tsx`・`ScrollTimeline.tsx`・`RecentMusic.*`／**全体**＝`app/motion.css`・`app/globals.css`・`app/refinements.css`・`components/Reveal.tsx`・`SectionHeading.tsx`・`Navbar.tsx`／`Navbar.css`・`CommandPalette.tsx`・`ScrollProgressBar.tsx`・`BackToTopButton.tsx`・`VelocityMarquee.tsx`・`Marquee.tsx`・`app/page.tsx`（制作の姿勢のセクション）・`app/template.tsx`・`PageTransition.tsx`．

## 最終報告に必ず入れること
1. 変更したファイルと要点 2. **動きの一覧表**（要素・目的・いつ・何が動くか・時間・遅れ・曲線・reduced-motion のときの扱い） 3. 既存の動きと競合しないための工夫 4. 実行したテスト・tsc・ESLint の結果と，**実行できなかった確認**（実際の見え方・実機の滑らかさは未確認，など）を正直に．

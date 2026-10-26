# ポートフォリオ・モーション設計 v1

メインサイトへ統合済み：`src/sections/Hero.tsx` / `Hero.module.css` / `src/hooks/useHeroMotion.ts` / `src/components/CursorRing.tsx` / `src/app/motion.css`。`/motion-lab/index.html` は比較用の初期試作として残す。

## コンセプト：Precision Playground

白い余白、青灰色の光、実際のアプリアイコン。静止状態は端正に、操作するとわずかな重さと弾力を感じる。「散らばったアイデアが、精密に組み上がる」をサイト全体の共通動作にする。

文章を増やす代わりに、整列・吸着・奥行きで開発者の精密さを伝える。見出し・作品名・操作ラベルは残し、キーボード操作や読み上げでも内容が成立する。色収差・高速点滅を常用せず、輪郭と移動の質で作品そのものを引き立てる。

## 演出の流れ

| 場所 | In | Hover / Focus | Scroll |
| --- | --- | --- | --- |
| ヘッダー | ロゴと細い水平線が整列する、0–500ms | リンクの磁力移動は最大7px、矢印が応答 | 縮小せず、読みやすい高さを維持 |
| Hero | 文字が下のマスクから異なる角度で起き上がる。アイコンは中心から外へ配置される、全体1.7秒以内 | アプリアイコンが9px浮き、クリック対象を示す | 最初の0.6画面で文字は70px、ビジュアルは100px後退。アイコンは別々の深さで移動 |
| Hero → 作品 | 青い光から杏色の光へ2枚の背景のopacityで移行 | 下向きの誘導線が伸びる | 固定シーンを抜けると作品パネルが下から重なる。ネイティブスクロールを維持 |
| 作品一覧 | 55px下・9度の傾きから950msで整列。横並びは90msずつずらす | 画像1.09倍・最大6.5pxの位置ずれ・光沢の掃引・角丸変形・タイトル4px上昇。カーソルはVIEWに変化 | 各カードは画面に入った時だけ一度登場 |
| Skills | 主役のSwift→Web→Python→組込みの順に60–90msずらす | 現在の光の追従を使い、カードの傾きは最大2度 | 数字は初回だけ数え上げる。技術を触ると対応作品への導線を示す |
| About / 開発の軌跡 | 線がつながり、節目が順番に現れる | 対応するアプリアイコンが浮く | 線の進行をscroll progressに連動。本文は一度表示したら動かさない |
| GitHub | 最新活動が小さな行単位で現れる | リポジトリ名に下線を描く | カードの一斉常時アニメーションは避ける |
| Contact / Footer | Heroで外へ散ったパーツが再びロゴ周辺へ整列 | 主CTAに同じ7pxの磁力、キーボードでは輪郭で応答 | 移動量が小さくなり、自然に終わる |

Hero・カーソル・作品カードはメインサイトへ統合した。Skills以降は既存の演出を維持しており、表の全シーンを新たに実装したという意味ではない。

## タイミングと材質

- 主イージング：`cubic-bezier(.16,1,.3,1)`。到達位置に速く近づき、終端に余韻を残す。
- 文字登場：1100ms、1文字38ms差、最初100ms待機。読み始められる文字から先に整列。
- アイコン展開：1250ms、110ms差。イントロとスクロールのtransformは別の親子要素に分ける。
- Hover：350–800ms。離れた時も原点へ戻す。微細な輪郭変形は小さい面積だけに限定。
- 追従：`alpha = 1 - exp(-dt / 75)`。リフレッシュレートに依存する固定係数補間を避ける。
- Scroll：位置関係はスクロール量へ直接対応。表示値だけを同じ時間補間でなめらかに追従させる。
- 実際の読み込みを待つ必要がないため、偽のパーセント表示・操作を止めるローダーは置かない。水平線は登場演出で、進捗表示ではない。

## 採用技術

HTML + CSS + JavaScript（ES Modules）。登場はWeb Animations API、連動はrequestAnimationFrameとIntersectionObserver。初期段階では追加パッケージなし。

背景の立体感はCSSのperspectiveと画像で成立するため、今回の試作ではWebGLを使わない。将来、屈折する実物の3D形状やシェーダー波紋を主役にするなら、その専用シーンにThree.jsを導入する。物理的な屈折・流体シミュレーションとCSSの疑似立体・輪郭変形は区別する。

GSAPへ統合する場合は、今回のWeb Animationsによる登場とrAFスクロールの所有者をGSAP側へ置き換える。同じtransformに複数システムを上書きさせない。

参照：
- https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
- https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

## 動く実装

`public/motion-lab/index.html` / `motion.css` / `motion.js`

開発サーバーで `/motion-lab/index.html` を開く。作品画像は既存の `/projects/*.webp` を使う。ファイルを別の環境へ移す場合は画像のパスも移す。既存トップページはそのままで、演出を独立して比較できる試作。

### 中核コード：文字が角度を持って組み上がる

```js
animate(glyph, [
  { transform: 'translate3d(20px,115%,0) rotateX(-75deg) rotateZ(9deg)', opacity: .2 },
  { transform: 'translate3d(0,0,0) rotateX(0) rotateZ(0)', opacity: 1 },
], {
  duration: 1100,
  delay: 100 + index * 38,
  easing: 'cubic-bezier(.16,1,.3,1)',
  fill: 'backwards',
});
```

各文字の親は`overflow: clip`、行には`perspective: 900px`を指定する。完成状態の文字を通常のCSSとして残し、アニメーションが終わったらAnimationを解除する。JavaScriptが実行されなくても本文は読める。

### 中核コード：必要な時だけ動く追従

```js
const request = () => {
  if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
};
function tick(now) {
  frame = 0;
  const dt = previousTime ? Math.min(now - previousTime, 48) : 16.67;
  previousTime = now;
  const alpha = 1 - Math.exp(-dt / 75);
  current.x += (target.x - current.x) * alpha;
  current.y += (target.y - current.y) * alpha;
  cursor.style.transform = `translate3d(${current.x}px,${current.y}px,0)`;
  if (Math.hypot(target.x-current.x, target.y-current.y) > .15) request();
  else previousTime = 0;
}
```

完全な実装ではscroll・磁力移動もこの1本のループへまとめる。通常カーソルは残し、カスタムカーソルは補助的なリングとして実装。停止時はrAFを止め、pointermoveやscrollで再開。

## パフォーマンス・ライフサイクル

1. Hero登場、Scroll、Hoverはそれぞれ別のラッパーを所有し、transformを競合させない。
2. pointermoveは座標保存だけ。フレーム内で必要な境界を測ってからスタイルを書き込む。
3. カーソルのサイズはwidth/heightを毎フレーム変更せず、固定サイズの内側をscaleする。
4. rAFは値が収束したら停止し、非表示タブでは停止する。resizeではHeroの範囲を再計算。
5. イベントはAbortController、Observerはdisconnect、rAFはcancelAnimationFrame、WAAPIはcancelで解除。`mountMotion()`はクリーンアップ関数を返す。
6. `pagehide`で停止し、bfcacheから`pageshow`で戻った時に再初期化。
7. reduced-motionの変更時は進行中の演出を解除して静止状態に復帰。fine pointerの変化にも再設定。
8. モバイルはHero固定区間を解除、カードは縦並び、カーソルと磁力は無効。作品やCTAは通常のリンクとして動く。
9. perspectiveやtransformは合成しやすい構成を狙うが、GPU化やフレームレートは保証しない。小さな角丸変形・光沢はペイントコストを計測し、低性能端末では省略。
10. 本番導入時は実機のPerformance記録でframe timeを測る。試作の表示確認だけを60fpsの保証とはしない。

## メインサイトへの統合と今後の拡張

- 統合済み：Heroの常時waveを文字合成・アイコン展開へ置き換え、ターミナル風の打鍵表示と共存させた。`useHeroMotion`で登場とスクロールを管理。
- 統合済み：`CursorRing`を停止可能な追従ループへ置き換え、磁力とVIEW表示を追加。幅の逐次変更とCursorGlowの重複描画は行わない。
- 統合済み：HeroとCursorは既存`scrollObserver`へ購読し、独立したscroll/resizeリスナーを追加しない。
- 統合済み：Apps・Worksの画像リンクへ`data-motion-work`を付与。ScrollZoomのラッパーとは別の画像でパララックスと拡大を処理し、紹介・公開作品へのリンクを維持。
- Skillsのカウント・光沢・傾きを共通のモーション値に合わせる。
- `motion.js`末尾の自動起動部分はHTML試作用。Reactへ移植する時は副作用をuseEffect内へ移し、返却されたdisposeをcleanupで呼ぶ。グローバル自動起動を残したままReact側でも起動しない。

## 確認項目

- 初回登場が1.7秒以内に整列し、途中でもCTAを操作できる。
- Heroから作品へスクロールが自然につながり、スクロール位置を奪わない。
- リンクに吸い付き、カードではVIEWへ変化。離脱・スクロール・タブ切り替えで状態が戻る。
- キーボードFocusでもカードの操作可能性が分かる。
- モバイルに横はみ出しがなく、作品の順番とリンク先を維持。
- reduced-motionでは文字が隠れず、カーソル・イントロ・3D連動が停止。
- 開発者コンソールに例外がなく、画像がすべて読み込める。

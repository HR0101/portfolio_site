# G項目の実装とチェック更新

更新日：2026-11-08。対象はローカルのRHサイト。

## 今回実装した項目

- [x] G06：Appsの説明欄でマウスに実画面プレビューが追従する。
- [x] G08・G10：既存の二重文字ロールをフッターナビへ展開し、240ms・PCホバーへ統一する。
- [x] G09：Apps／Worksの詳細リンクで斜め矢印を二重化し、右上へ抜けて左下から入る。
- [x] G11：短い英語ラベル・技術タグで、元の文字を並べ替えて左から正しい並びへ戻す。
- [x] G13：ソースコードリンクとContactのEmail／GitHubで、二本の下線が走り抜ける。
- [x] G17：各セクションの見出し上で、区切り線を左から一回だけ描画する。

## 場所と操作

| 項目 | 実装先 | 動作 |
| --- | --- | --- |
| G06 | `src/components/AppCursorPreview.tsx` / `.css`、`src/lib/cursorPreview.ts`、`src/sections/Projects.tsx` | BusTimeApp・Ark Server・TeleDeck・Tsumugiの4件。PCの説明欄で表示し、リンク上・領域離脱・Tab等のキー操作・スクロール・リサイズ・タブ非表示で消える。 |
| G08・G10 | `src/components/RollLabel.tsx`、`src/app/globals.css`、`src/components/Footer.tsx` | ナビ・Works補助リンクと共通化。リンクのクリック領域は移動しない。 |
| G09 | `src/components/ArrowSwap.tsx`、`src/app/link-motion.css`、Projects / Works | 装飾用SVGを二つ重ねる。読み上げは元のリンク文言のみ。 |
| G11 | `src/components/HoverShuffle.tsx`、SectionHeading / Projects | 元の文字を使用。スペースの位置と表示幅を保つ。240msで確定、途中で離れると即時復元。日本語の説明文・名前・件数には適用しない。 |
| G13 | `src/app/link-motion.css`、Projects / Works / Contact | 最初から下線を見せ、ホバー時に線を入れ替える。キーボードのfocusは即時表示。 |
| G17 | `src/components/RevealLine.tsx`、SectionHeading | 既存useInViewを利用し、一回だけ600msで描く。 |

既存の`--site-ease`と`createPointerSpring`を再利用。新しいアニメーション依存は追加していない。追従位置はReactの毎フレーム再描画を使わず、停止時にはrAFも停止する。

## 動きを減らす設定・タッチ

ホバー演出は`hover:hover`・`pointer:fine`・`prefers-reduced-motion:no-preference`で制限。追従プレビューは幅1024px以上のみ。スマホでは既存カードの画像とリンクをそのまま使用し、追加のタップ操作は要求しない。

動きを減らす設定ではプレビュー・文字シャッフル・文字ロール・矢印移動・線の走り抜けを行わず、区切り線は静止表示する。キーボードfocusでホバーの振り付けを再生しない。

## 確認結果

- `npm run typecheck`：通過。
- 変更したTS / TSXとプレビュー用テストのESLint：通過。
- `npm run test:motion`：9件通過。プレビューの左右折り返し・一覧と画面端への収まり・固定ナビ回避の3件と、既存粒子の6件。
- 開発サーバーのHTTP 200、HTMLに6種類の演出と4件のプレビュー対象が組み込まれていることを確認。
- Chrome Canary：区切り線とリンク類の表示、BusTimeAppの説明欄で実画面プレビューが出ること、Tabで消えて通常の詳細リンクにfocusが移ることを確認。
- スマホ実機・OSのreduced motion切替は今回実操作していない。対応条件はコードで確認した。

## 資料のチェック

[全体カタログ](../references/united-carriers-motion-reference.md)と[応用判断表](../../plans/united-carriers-adoption-map.md)のG01〜G32を、現在のコードに合わせて1項目ずつ更新。16項目が`[x]`。似た実装だけの項目は`[ ]`のまま差分を記載した。

チェックはRH向け対応実装の有無を示す。参照サイトの直接観測完了や、全受け入れ条件の実機検証済みを意味しない。元の調査・設計資料に残る未確認事項は履歴として保持している。

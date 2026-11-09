# RH Flame — ファビコン

RHロゴから鳥を組み込んだRだけを取り出し、正方形のアイコンに整形したものです。
Rのカーブ・斜め脚・鳥の本体と下の羽根の4本のパスを保ち、角丸背景に配置しています。
ブラウザ用はRを横幅の約97%まで拡大し、角丸も小さくしています。
スマートフォン用はOSのマスクで羽根が切れないよう、専用の余白を設けています。
サイトには白背景・黒いロゴの白黒版を適用しています。

## 編集・確認

- `RH-Flame-favicon.svg` — 512px角の編集用ベクター原稿。
- `RH-Flame-favicon-preview.png` — 大きい表示と実寸16・32・48・64px、白黒を含む4配色の比較。

## 配布用

`public/favicons/rh-flame-favicons.zip`に白黒・オレンジ×ブルー・ブルー・オレンジの4セットを収録。
各配色のフォルダには次が含まれます。

- `favicon.svg` — ブラウザ用のベクターアイコン。
- `favicon.ico` — 16・32・48・64pxを収録したICO。
- `icon-16.png` / `icon-32.png` / `icon-48.png` / `icon-64.png` — 小さいサイズのPNG。
- `icon-192.png` / `icon-512.png` — Webアプリアイコン。
- `apple-touch-icon.png` — 180px角、不透明背景のiOS用アイコン。
- `icon-maskable-512.png` — 512px角、不透明背景で外周に余白を設けたマスク対応アイコン。

## サイトへの適用

Next.jsの規約に合わせて`src/app/icon.svg`、`src/app/favicon.ico`、
`src/app/apple-icon.png`を更新済み。`src/app/manifest.ts`にWebアプリ用PNGを登録しています。

再生成:

```sh
node scripts/create-favicons.mjs
```

既存のSharpと、PythonのPillowを使用します。

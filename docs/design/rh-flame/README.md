# RH Flame

ユーザーが提示した参考画像の、流れる羽根・鳥を組み込んだR・右上へ抜けるHの横画・
オレンジ〜赤紫のグラデーションをベクターで描き起こした案です。

- `RH-Flame.ai` — Illustratorで保存した編集用データ。背景透明、400 × 200。
- `RH-Flame.svg` — Illustratorに読み込んだベクター原稿。
- `RH-Flame-dark.svg` — 濃紺背景付きの確認用原稿。
- `RH-Flame-preview.png` — 濃紺背景付き、1000 × 500の確認画像。

Web用ファイルは`public/brand/`にあります。

## 白黒版

- `RH-Flame-monochrome.ai` — Illustratorで保存した白地・黒地の比較用編集データ。
- `RH-Flame-monochrome.svg` / `RH-Flame-monochrome-preview.png` — 白黒2種類の比較。
- `RH-Flame-black.svg` / `RH-Flame-white.svg` — 背景透明の黒・白の単色ベクター。
- Web用は`public/brand/rh-flame-black.svg` / `rh-flame-white.svg`と各透過PNG。

承認済みの10本のパスを保ち、塗りを純黒・純白へ変更しています。
サイトのファビコン・Appleアイコン・Webアプリ用アイコンには白黒版を適用しています。

- `rh-flame.svg` — カラー、背景透明。
- `rh-flame.png` — 1200 × 600、背景透明。
- `rh-flame-white.svg` — 白の単色版、背景透明。

## 色違い

- `RH-Flame-orange-blue.ai` — オレンジの鳥と青いHを組み合わせた版。背景透明。
- `RH-Flame-colourways.ai` — オレンジ×ブルー・ブルー系・オレンジ系の3配色を比較できる編集用データ。
- `RH-Flame-colourways.png` — 3配色の確認画像。
- `RH-Flame-orange-blue.svg` / `RH-Flame-blue.svg` / `RH-Flame-orange.svg` — 各配色の原稿。

各配色のWeb用SVGと透過PNGは`public/brand/rh-flame-orange-blue.*`、
`rh-flame-blue.*`、`rh-flame-orange.*`です。形状と配置は元の承認済みロゴと同一です。

配色版の再生成は`python3 scripts/create-flame-colorways.py`で行います。

形状は10本の名前付きパス、色は7つの線形グラデーションです。
Illustratorでは羽根、Rのカーブと斜め脚、Hの縦画、横方向の帯を個別に編集できます。
外部フォントや埋め込み画像はありません。

SVG原稿の再生成:

```sh
python3 scripts/create-flame-logo.py
```

AI形式はIllustratorで開いて保存してください。

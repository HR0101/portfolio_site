# RH Flight

RHの文字そのものを、Swiftを思わせる飛ぶ鳥の輪郭として描いたロゴ。
Rの斜め脚がHの左の画を兼ね、上端が2枚の翼、中央の横画が胴体、右端が頭になります。
ロゴ単体は、外周とRの抜き部分からなる1つの複合パスです。

## 編集用

- `RH-Flight-integrated-symbol.ai` — Illustratorで保存した、一体の輪郭で構成したRH。背景は透明。
- `RH-Flight-integrated-master.ai` — 一体型RHの基本形・横長版・単色・白抜き・縮小表示の一覧。
- `R-Flight-symbol.ai` — Rだけを翼と尾の曲線で構成した別案。
- `R-RH-comparison.ai` — R単体案と一体型RH案の比較。
- `RH-Flight-master.svg` — 一覧のSVG原稿。説明文は編集可能なテキスト。
- `RH-Flight-symbol.svg` — ロゴ単体のSVG原稿。
- `RH-Flight-preview.png` — 一覧の確認画像。

AI形式はIllustrator 2020以降と互換性があり、PDF互換データも含みます。
ロゴのRHと名前の文字はアウトライン。AIマスターでは一覧の説明文もアウトライン化しています。
主色はサイトのアクセントカラー `#396DA9`、横長版の名前は `#1D1D1F`。

## Web向けファイル

`public/brand/` に背景透過の次のファイルを用意しています。

- `rh-flight.svg` — 青のロゴ単体。
- `rh-flight-wordmark.svg` — ロゴとRyuto Haraの名前を組み合わせた横長版。
- `rh-flight-mono.svg` — 濃いグレーの単色版。
- `rh-flight-white.svg` — 白抜き版。
- `rh-flight.png` — 768px角の透過PNG。
- `r-flight.svg` / `r-flight-mono.svg` / `r-flight-white.svg` — R一文字の青・単色・白抜き版。

SVGは外部画像、フォント、フィルターを使用しません。ロゴのパス形状を直接編集できます。
サイトへの配置変更はこの制作には含めていません。

## 原稿の再生成

```sh
python3 scripts/create-brand-logo.py
```

SVG原稿の再生成後はIllustratorで開き、必要な調整をしてAI形式で保存してください。

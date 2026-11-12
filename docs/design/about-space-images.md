# 自己紹介カード用の宇宙背景画像 — 生成記録

- 生成日：2026年11月9日（Asia/Tokyo）
- 生成の仕組み：Codex の built-in 画像生成ツール `image_gen.imagegen`（呼び出し名：`image_gen__imagegen`）。画像ごとに独立したプロンプトで1回ずつ、合計4回生成した。
- 生成時の指定：`transparent_background=false`。入力画像は使用していない。モデル名はツールから通知されていないため記載しない。
- 外部の既存写真やダウンロード素材は使用していない。天体写真風のAI生成画像であり、実際の観測写真ではない。
- 用途：横560 × 縦400 pxの自己紹介カード向け、2倍解像度の背景画像。白い文字を重ねるため、左側と下側、特に左下の暗い余白を優先した。

## 出力

全画像：WebP、1120 × 800 px（7:5）、RGB、品質82、PillowのWebPエンコーダー `method=6`。

| ファイル（リポジトリ相対） | バイト数 | 内容 |
| --- | ---: | --- |
| `public/about/space-learn.webp` | 14766 | 右上の青い大気の層と、控えめな町の灯りを伴う夜側の地球。 |
| `public/about/space-apps.webp` | 13908 | 右上の淡い核から細いフィラメントが伸びる青紫の散光星雲。 |
| `public/about/space-hardware.webp` | 14010 | 右側の地球の縁に沿って立ち上がる緑〜ティールのオーロラ。 |
| `public/about/space-trust.webp` | 9778 | 右上の惑星の縁から差す、琥珀〜桃色の控えめな日の出。 |

## 後処理と確認

生成PNGは4枚とも1484 × 1060 pxで、すでに7:5の比率だった。切り抜きは不要だったため、画面全体を保ったままLanczosで1120 × 800 pxに縮小し、WebPへ変換した。色調補正・合成・描き足しはしていない。暗い余白と周辺減光は画像生成時に指示した。

変換手順（Python / Pillow、各入力と出力の対応は次表）：

```python
from PIL import Image, ImageOps

with Image.open(source_png) as source:
    image = ImageOps.exif_transpose(source).convert("RGB")
    assert image.size == (1484, 1060)
    image = image.resize((1120, 800), Image.Resampling.LANCZOS)
    image.save(destination_webp, "WEBP", quality=82, method=6)
```

| 出力 | 元の生成PNG |
| --- | --- |
| `space-learn.webp` | `/Users/Rhara/.codex/generated_images/01a1be68-5611-72a3-946d-559e4f99f32e/exec-7c2dd2bd-03e9-43b5-9a30-bc3e587ee822.png` |
| `space-apps.webp` | `/Users/Rhara/.codex/generated_images/01a1be68-5611-72a3-946d-559e4f99f32e/exec-d840b513-efa3-42cc-9250-203ea7598ec7.png` |
| `space-hardware.webp` | `/Users/Rhara/.codex/generated_images/01a1be68-5611-72a3-946d-559e4f99f32e/exec-e2f838d0-69e5-47f1-8382-8cbf32aeba74.png` |
| `space-trust.webp` | `/Users/Rhara/.codex/generated_images/01a1be68-5611-72a3-946d-559e4f99f32e/exec-581683d8-e621-4df9-9aa0-f35d4317bbdb.png` |

出力WebPを再読み込みして形式・寸法・ファイル容量を確認し、全画像が200,000バイト以下であることを検証した。さらに560 × 400 px相当の一覧で目視確認し、天体の配置、左下の暗い余白、文字・ロゴ・透かし・人物・宇宙船のないことを確認した。サイトの実際の文字を重ねた表示確認は行っていない。

## 利用条件

このプロジェクト用に新規生成した4枚は、このポートフォリオサイトの背景として自由に使用できる。サイトへの組み込み、公開、配信、および背景用のリサイズ・切り抜き・圧縮に利用できる。本制作物について追加のクレジット表記は要求しない。

## 使用したプロンプト（原文）

以下は各画像生成ツール呼び出しに渡した全文をそのまま記録したもの。

### space-learn.webp

```text
Use case: photorealistic-natural.
Asset type: photographic deep-space background for a portfolio introduction card with white heading and body text overlaid later.
Create ONE single image, landscape 7:5 (1120:800 aspect ratio); if necessary generate 3:2 with all important composition safe for a centered 7:5 crop. No panel, collage, borders or typography.
Style: convincingly realistic orbital / astronomical photography, delicate physical light scattering, natural exposure and fine photographic texture, like a restrained Hubble / Webb / ISS photograph. No illustration, digital painting, game art, CGI render look, oversized lens flares or cinematic spectacle.
Composition and readability are critical: put the astronomical subject and all notable highlights in the UPPER RIGHT and along the RIGHT side. The LEFT 55 percent and the LOWER 30 percent, especially the lower-left, must be very dark, quiet, low-detail negative space, with virtually no bright stars there. Overall background almost black to deep navy, near #03040a through #0b0f26. White text must remain easy to read over this space. Keep even the right-hand subject softly exposed, no blown-out highlights. Natural edge vignetting on all four edges so it blends into a dark card.
Absolutely no text, letters, logos, watermark, people, spacecraft, satellites, buildings, equipment, or other artificial objects.
Subject: the curved night-side limb of Earth seen from low orbit, occupying only the upper-right/right region and fading into shadow. A thin, subtle blue atmospheric glow (#7297c9 family) traces the upper-right rim; just a few tiny faint city lights on the night side, never a dense bright grid. Dark planet and empty black space merge softly toward the lower and left sides. Restrained blue light, plausible atmospheric scale and Earth curvature.
```

### space-apps.webp

```text
Use case: photorealistic-natural.
Asset type: photographic deep-space background for a portfolio introduction card with white heading and body text overlaid later.
Create ONE single image, landscape 7:5 (1120:800 aspect ratio); if necessary generate 3:2 with all important composition safe for a centered 7:5 crop. No panel, collage, borders or typography.
Style: convincingly realistic orbital / astronomical photography, delicate physical light scattering, natural exposure and fine photographic texture, like a restrained Hubble / Webb / ISS photograph. No illustration, digital painting, game art, CGI render look, oversized lens flares or cinematic spectacle.
Composition and readability are critical: put the astronomical subject and all notable highlights in the UPPER RIGHT and along the RIGHT side. The LEFT 55 percent and the LOWER 30 percent, especially the lower-left, must be very dark, quiet, low-detail negative space, with virtually no bright stars there. Overall background almost black to deep navy, near #03040a through #0b0f26. White text must remain easy to read over this space. Keep even the right-hand subject softly exposed, no blown-out highlights. Natural edge vignetting on all four edges so it blends into a dark card.
Absolutely no text, letters, logos, watermark, people, spacecraft, satellites, buildings, equipment, or other artificial objects.
Subject: delicate thin filaments of blue-violet diffuse emission nebula gas (#9a86c5 family), concentrated in the upper-right/right region. A softly luminous, small pale core in the upper right, surrounded by a sparse field of small natural stars in the upper-right region. Wispy, physically plausible gas and dark dust, gently fading into empty navy-black toward left and bottom. Understated real telescope exposure, not a brilliant colorful fantasy nebula.
```

### space-hardware.webp

```text
Use case: photorealistic-natural.
Asset type: photographic deep-space background for a portfolio introduction card with white heading and body text overlaid later.
Create ONE single image, landscape 7:5 (1120:800 aspect ratio); if necessary generate 3:2 with all important composition safe for a centered 7:5 crop. No panel, collage, borders or typography.
Style: convincingly realistic orbital / astronomical photography, delicate physical light scattering, natural exposure and fine photographic texture, like a restrained Hubble / Webb / ISS photograph. No illustration, digital painting, game art, CGI render look, oversized lens flares or cinematic spectacle.
Composition and readability are critical: put the astronomical subject and all notable highlights in the UPPER RIGHT and along the RIGHT side. The LEFT 55 percent and the LOWER 30 percent, especially the lower-left, must be very dark, quiet, low-detail negative space, with virtually no bright stars there. Overall background almost black to deep navy, near #03040a through #0b0f26. White text must remain easy to read over this space. Keep even the right-hand subject softly exposed, no blown-out highlights. Natural edge vignetting on all four edges so it blends into a dark card.
Absolutely no text, letters, logos, watermark, people, spacecraft, satellites, buildings, equipment, or other artificial objects.
Subject: the dark curved limb of Earth photographed from orbit with a green-to-teal aurora (#69a797 family) suspended along the rim. The auroral curtains form fine, soft vertical folds on the RIGHT side and upper-right, with a faint atmospheric arc. Subtle photographic green emissions, physically plausible aurora scale, very dark Earth. The aurora never crosses into the left text area or the dark lower area. No visible human-made light sources.
```

### space-trust.webp

```text
Use case: photorealistic-natural.
Asset type: photographic deep-space background for a portfolio introduction card with white heading and body text overlaid later.
Create ONE single image, landscape 7:5 (1120:800 aspect ratio); if necessary generate 3:2 with all important composition safe for a centered 7:5 crop. No panel, collage, borders or typography.
Style: convincingly realistic orbital / astronomical photography, delicate physical light scattering, natural exposure and fine photographic texture, like a restrained Hubble / Webb / ISS photograph. No illustration, digital painting, game art, CGI render look, oversized lens flares or cinematic spectacle.
Composition and readability are critical: put the astronomical subject and all notable highlights in the UPPER RIGHT and along the RIGHT side. The LEFT 55 percent and the LOWER 30 percent, especially the lower-left, must be very dark, quiet, low-detail negative space, with virtually no bright stars there. Overall background almost black to deep navy, near #03040a through #0b0f26. White text must remain easy to read over this space. Keep even the right-hand subject softly exposed, no blown-out highlights. Natural edge vignetting on all four edges so it blends into a dark card.
Absolutely no text, letters, logos, watermark, people, spacecraft, satellites, buildings, equipment, or other artificial objects.
Subject: a star just beginning to rise from behind the shadowed curved limb of a planet, positioned in the upper right. A restrained warm amber-to-soft-peach glow (#c79479 family), a small understated corona just above the planetary rim, and only a few faint natural stars around the upper-right region. The star is mostly occulted so there is no large white disc and no blown-out flare. Planet and space fade into nearly black navy across the left and lower portions. Realistic orbital astrophotography with plausible soft scattered light.
```

# RH Core — 3Dモデル

既存Heroの角丸プレートとRHを、実際に厚みのあるメッシュとして作成。
白い磁器調の本体と、面取りしたサテンシルバーの文字を組み合わせています。

## ファイル

- `public/models/rh-core.glb` — サイト用。プレートとRHの完成モデル。
- `public/models/rh-monogram.glb` — Heroで使用している文字だけのモデル。
- `public/models/rh-monogram-front.png` — Heroの代替画像。プレートのない文字だけの透過PNG。
- `public/models/rh-core-preview.png` — 斜めから見たスタジオレンダリング。
- `public/models/rh-core-front.png` — 正面の透過PNG。代替画像にも使用可能。
- `docs/design/rh-core/rh-core.blend` — 編集用。モデル、スタジオ照明、カメラを収録。
- `docs/design/rh-core/manifest.json` — 軸、パーツ名、ファイルサイズ。

## サイトへの組み込み

GLBはテクスチャ・外部フォント・追加デコーダー不要。Three.jsの
Heroでは`GLTFLoader`で`/models/rh-monogram.glb`を読み込んでいます。
角丸プレートは表示せず、立体のRHだけが浮かびます。

- glTFの上方向は **+Y**、正面は **+Z**。
- 原点は本体の中心。アプリアイコンの公転中心にもそのまま使えます。
- 本体サイズは **2.8 × 2.8 × 0.38**（文字の突出部分を除く）。
- Hero用の文字モデルは`RH_Core`配下に`Letter_R`、`Letter_H`を分離。
  プレート付きモデルには`Core_Porcelain`も含まれます。
- GLBは正面向き。プレビューの傾き、床、照明、カメラは含みません。
- PBR材質なので、表示時は環境光・スタジオ環境マップなどで金属の反射を設定してください。
- `src/components/HeroUniverse.tsx`でHeroに組み込み済み。傾いた軌道上の3D座標を
  DOMリンクに投影し、RHの手前・奥を通る公転を表現しています。
- 1周48秒。ホバー・フォーカス・一時停止ボタンで止まり、動きを減らす設定では静止します。
- 画面外・非表示タブでは描画を停止。WebGLやモデル読み込みに失敗した場合はPNGと通常のリンクを表示します。

## 再生成

```sh
blender --background --python scripts/create-rh-model.py
```

Arialがある環境ではそれを形状に変換し、無い環境ではBlender標準フォントを使います。
完成したGLBにフォントへの参照はありません。正確に同じ文字形状で編集する場合は、
同梱の`.blend`内の変換済みメッシュを使ってください。

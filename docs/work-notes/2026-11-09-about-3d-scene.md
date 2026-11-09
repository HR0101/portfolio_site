# Aboutの3D・動画スクラビング試作

> 過去の試作記録。ユーザーの品質判断により、この3D・動画実装は取り外した。現在は[自己紹介カードの固定表示](2026-11-09-about-cards.md)に置き換えている。以下は試作当時の検証内容。

自己紹介セクションだけで一つの物体を追える構成に変更。学ぶ→つくる→つなぐ→届ける、の4項目を共通のスクロール進捗で紹介する。Skillsへの拡張はしていない。

- [x] カード形状から縦長の3D端末へ変形。
- [x] BusTimeAppの既存の実操作映像 `bustimeapp-demo-scroll.mp4` をスクロール位置でseekし、3D画面のテクスチャへ反映。
- [x] 画面と模式基板を分離して再結合。実機内部の再現ではなく、ソフト・ハードの関心を伝える模式図。
- [x] 説明・進捗線・章選択を同じ進捗で更新。直接選択とキーボード操作にも対応。
- [x] WebGPURendererを遅延読み込み。WebGPU→WebGL2→HTML動画/ポスターへフォールバック。
- [x] 画面外・非表示タブで描画/seekを停止。通常時も常時描画せず、更新時だけ描画。
- [x] 小画面・reduced motionでは長い固定スクロールを使わず、章を直接選択。
- [x] 既存の白黒テーマに対応。

参照IDはH16/H17、A05/A06のRH向け応用。参照サイトと同じ内部実装という意味ではない。

検証：Chrome Canaryの実画面でWebGPU描画、カード/端末/分離/再結合、逆スクロール、動画の異なる操作画面、章の直接選択、矢印キー/Endキー、ライト/ダーク、約560 CSS pxのコンパクト表示を確認。型検査、変更ファイルのESLint、モーションテスト35件、差分の空白チェック、HTTP 200が通過。

WebGL2とHTMLへの切替はコード上に実装。実機のWebGL2専用環境、reduced motion設定、スマートフォン実機、production buildは今回未検証。

主な実装：`src/sections/About.tsx`、`src/components/AboutDevice.tsx`、`src/lib/aboutDeviceScene.ts`、`src/lib/aboutScene.ts`、`src/lib/videoScrubber.ts`。

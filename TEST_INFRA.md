# テスト構成

## 現行：E2E スモークテスト

`tests/e2e.test.mjs` が **本番ビルドしたサイトを実際に起動して** 検証します．Node.js 標準の `node:test` のみを使い，外部の
テストランナーやブラウザ自動化ツールには依存しません．

```bash
npm run build && npm test
```

内部では `next start -p 3111` でサーバーを立ち上げ（開発サーバーの 3001 とは別ポート），HTTP 経由で応答を検証してから
プロセスを終了します．未ビルドの場合は「先に `npm run build` を実行してください」と明示して失敗します．

### 検証している内容（25ケース）

| 区分 | 検証内容 |
| --- | --- |
| ページ構造 | `lang="ja"`，6セクションの存在，スキップリンク，h1 がページに1つだけ，問い合わせ導線と入力上限 |
| アプリカタログ | 17プロダクトすべての掲載，GitHub リンクが実在の URL，公式WebPアイコン，タブの ARIA 実装，年表の描画 |
| メタデータ | title / description，OGP・Twitter カード，構造化データ（`SoftwareApplication` と件数） |
| 補助ファイル | robots.txt，sitemap.xml，OGP 画像（PNG），ファビコン |
| API ルート | 3本すべてが HTTP 200 と正しい `apiStatus` を返すこと，フォールバックが実在リポジトリのみを返すこと |
| テーマ | 既定が白基調（`.dark` が付かない）であること，Web アプリマニフェスト |
| キャッシュ | API レスポンスの `Cache-Control` と `x-api-status` |
| エラー処理 | 専用 404 ページ，CSP・COOP を含むセキュリティヘッダー，`X-Powered-By` の非表示 |

### CI

`.github/workflows/ci.yml` が push と Pull Request で `typecheck → lint → build → test` を実行します．
ローカルでは `npm run check`（型・lint・ビルド・E2E）でまとめて確認できます．

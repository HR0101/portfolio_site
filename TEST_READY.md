# テスト実行チェックリスト

```bash
npm install          # 初回のみ
npm run check        # 型チェック → lint → 本番ビルド → E2E スモークテスト
```

- 開発サーバー（`npm run dev`）を起動したまま `npm run build` を実行しないでください．`.next` が削除され，
  起動中のサーバーが 500 を返すようになります（再起動で復旧します）．
- `npm test` は本番サーバーをポート **3111** で一時的に起動します．このポートが空いている必要があります．
- `GITHUB_TOKEN` の有無でテスト結果は変わりません（API ルートはどちらでも HTTP 200 と `apiStatus` を返す設計のため）．

詳しい検証内容は [TEST_INFRA.md](TEST_INFRA.md) を参照してください．

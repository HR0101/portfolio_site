# Portfolio Site

Swift / SwiftUI で個人開発した iPhone・Mac アプリを紹介する，個人ポートフォリオサイトです．
Next.js 14（App Router）+ TypeScript + Tailwind CSS v4 で構築し，GitHub（[HR0101](https://github.com/HR0101)）の活動を動的に取得して表示します．

## セクション構成

| # | セクション | 内容 |
| --- | --- | --- |
| 01 | Hero | キャッチコピーと CTA |
| 02 | About | 自己紹介（4枚のカード） |
| 03 | Skills | 主要スキルの習熟度バーと関連技術タグ |
| 04 | Apps | Swift 製アプリのカタログ（プラットフォーム絞り込み付き） |
| 05 | GitHub | リポジトリ一覧・最近のアクティビティ・Contribution Graph |
| 06 | Contact | メーラーを起動する問い合わせフォーム |

## コマンド

```bash
npm install
npm run dev      # 開発サーバー（http://localhost:3001）
npm run build    # .next を削除してから本番ビルド
npm start        # 本番サーバー
```

> **注意**: 開発サーバーの起動中に `npm run build` を実行すると `.next` が削除され，
> 開発サーバー側が `Cannot find module './xxx.js'` で 500 を返すようになります．その場合は開発サーバーを再起動してください．

## 環境変数

`.env.local` に `GITHUB_TOKEN` を設定すると，Contribution Graph を GraphQL から取得して自前描画し，
GitHub API のレート制限も緩和されます（`.env.local.example` を参照）．未設定でも全機能が動作します．

- API Route は必ず HTTP 200 を返し，実際の状態は JSON 内の `apiStatus`（`success` / `offline` / `rate_limited` / `no_token`）で伝えます．
- クライアントは localStorage に1時間キャッシュし，「キャッシュ → API → 静的フォールバック」の順に表示を組み立てます．

## アプリカタログの編集

Apps セクションの内容は **`src/data/apps.ts`** に集約しています．アプリを追加するときは `SWIFT_APPS` に1件追加してください．

```ts
{
  name: 'アプリ名',
  platform: 'ios',            // 'ios' | 'macos' | 'both'
  tagline: '1行のキャッチコピー',
  description: '詳細説明',
  tags: ['SwiftUI', 'SwiftData'],
  year: '2026',
  icon: Sparkles,             // lucide-react のアイコン
  gradient: 'from-sky-500 to-blue-600',
  featured: true,             // true なら大きなカードで表示
  repositories: [{ name: 'GitHub のリポジトリ名' }],
}
```

- サーバー＋クライアントのように2リポジトリで1プロダクトを構成する場合は，`repositories` に2件並べ，`role` に役割を書きます．
- ここに登録した `tagline` は，GitHub 側に description が無いリポジトリの説明としても再利用されます（`findTaglineByRepository`）．

## 設定値

`src/config/site.ts` に GitHub ユーザー名・表示名・肩書き・問い合わせ先メールアドレスをまとめています．
Contact セクションのフォームとフッターのメールリンクは，ここに設定したアドレス宛にメーラーを起動します．

## その他

- テーマはダークモードが既定で，localStorage に `light` が保存されている場合のみライト表示になります．
- アニメーションは外部ライブラリを使わず，IntersectionObserver（`useInView`）+ CSS トランジションで実装しています．
- `src/legacy/`，ルートの `index.html`，`dist/` は Vite 時代の残骸です（`tsconfig.json` で除外済み）．
- `tests/` の自作 E2E スイートは旧構成（Timeline / Blog）向けで，現在の構成には追随していません．

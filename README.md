# Portfolio Site

公開サイト: **https://hr0101.dev/**（Cloudflare DNS + AWS S3 / CloudFront）

Swift / SwiftUI で個人開発した iPhone・Mac アプリを紹介する，個人ポートフォリオサイトです．
Next.js 16（App Router）+ TypeScript + Tailwind CSS v4 で構築し，GitHub（[HR0101](https://github.com/HR0101)）の活動を動的に取得して表示します．

Node.js 20.19以降（または22.13以降）を使用してください．

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
npm run dev        # 開発サーバー（http://localhost:3001）
npm run build      # .next を削除してから本番ビルド
npm start          # 本番サーバー
npm run lint       # ESLint
npm run typecheck  # 型チェック
npm test           # E2E スモークテスト（先に npm run build が必要）
npm run check      # typecheck → lint → build → E2E
```

> **注意**: 開発サーバーの起動中に `npm run build` を実行すると `.next` が削除され，
> 開発サーバー側が `Cannot find module './xxx.js'` で 500 を返すようになります．その場合は開発サーバーを再起動してください．

## 品質チェックと CI

### Dockerで起動・テストする

Docker Desktop（Compose対応）を起動しておけば、ホストにNode.jsをインストールせずに実行できます。
Node.js 22のLinuxコンテナを使用します。参照元のegiftサイトと同様に、開発時はソースを共有し、依存パッケージは名前付きボリュームに保存します。このサイトにデータベースは不要です。

```bash
# 開発サーバーをバックグラウンド起動（ソース変更を自動反映）
docker compose up --build -d --wait web
# http://localhost:3002

# 型チェック → ESLint → 本番ビルド → E2Eスモークテスト
docker compose --profile test run --build --rm test

# 状態・ログの確認
docker compose ps
docker compose logs -f web

# 停止（依存パッケージと開発キャッシュは保持）
docker compose down
```

同じ操作を `npm run docker:up` / `npm run docker:test` / `npm run docker:down` でも実行できます。
ポートが使用中の場合は `PORTFOLIO_PORT=3003 docker compose up --build -d --wait web` のように変更してください。
公開先はローカルPCのみ（127.0.0.1）です。

開発用の `node_modules` と `.next` はDocker専用ボリュームに分離しています。
起動時に `npm ci` で依存関係を揃えるため、package-lock.jsonを更新したら `docker compose restart web` を実行してください。
開発時は共有したソースにNext.jsが生成する型定義などが書き込まれることがあります。

テストはソースをイメージにコピーして実行し、ホストのファイルや開発用ボリュームには書き込みません。
テスト用サーバーはコンテナ内の3111番で起動・終了するため、開発サーバーと同時に実行できます。
毎回 `--build` を付けることで最新の変更を検証し、失敗時は非ゼロの終了コードを返します。
これはHTTPレスポンスを確認するスモークテストで、ブラウザの見た目を自動判定するものではありません。

`.env*` はイメージに含めません。開発サービスでは既存の `.env.local` をソース共有経由で読み込めます。
テストはトークンなしで実行でき、GitHub APIに接続できない場合のフォールバックも既存実装で扱います。

### ローカル・CI

`.github/workflows/ci.yml` が push / Pull Request で `typecheck → lint → build → test` を実行します．
ローカルでも `npm run check` で同じ検証を一括実行できます．

## テスト

`tests/e2e.test.mjs` が本番ビルドを実際に起動して 36 項目を検証します（セクション構成・アプリ掲載・アプリ専用ページ・公式アプリアイコン・GitHub リンク・問い合わせ導線・タブの ARIA・メタデータ・構造化データ・robots / sitemap / OGP 画像・API ルート・404・セキュリティヘッダー）．

```bash
npm run build && npm test
```

## 環境変数

AWSでの公開は [DEPLOY.md](DEPLOY.md) を参照してください。AWS CLI認証後、`npm run deploy:aws` でS3 + CloudFrontの構築、HTTPS公開、公開URLの反映とHTTP検証まで実行できます。

| 変数 | 用途 |
| --- | --- |
| `GITHUB_TOKEN` | Contribution Graph の自前描画（GraphQL）と API レート制限の緩和 |
| `NEXT_PUBLIC_SITE_URL` | 公開 URL．OGP 画像・sitemap・canonical の絶対 URL に使う |

どちらも未設定でローカル動作します（`.env.local.example` を参照）．公開時は canonical・OGP・sitemap を正しい URL にするため，`NEXT_PUBLIC_SITE_URL` を必ず設定してください．Vercel では同変数が未設定でも，環境が提供する本番 URL を自動利用します．

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
  imageSrc: '/projects/app.webp', // 任意：公式アプリアイコン
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

## SEO・アクセシビリティ

- OGP 画像（`src/app/opengraph-image.tsx`）は `next/og` でビルド時に生成します．日本語フォントを埋め込んでいないため，**画像内の文字は欧文のみ**にしてください．
- 構造化データ（JSON-LD）はアプリカタログから自動生成されるため，`SWIFT_APPS` にアプリを追加すれば検索エンジン向けの一覧にも反映されます．
- 「本文へスキップ」リンク，`:focus-visible` のフォーカスリング，WAI-ARIA タブパターン（←→ / Home / End キー対応）に対応しています．

## その他

- テーマは**白基調のライトモードが既定**で，localStorage に `dark` が保存されている場合のみダーク表示になります．配色は `globals.css` の `@theme`（`cream` / `mist` / `soft` / `ink`）に集約しています．フォントは外部取得に依存しない OS 標準 UI フォントです．
- アニメーションは外部ライブラリを使わず，CSS キーフレーム + 自作の TypeScript フック（`useInView` / `useScrollLinked` / `useTilt` / `useScrollProgress` / `useCountUp` / `useActiveSection`）で実装しています．
- スクロール連動の演出（Hero の退場，背景の視差，横に流れる帯，年表の線，Contribution Graph の出現）は `src/lib/scrollObserver.ts` に監視を集約し，リスナーはページ全体で1本だけです．
- Apps セクションの年表の内容は `src/data/timeline.ts` を編集してください．
- `prefers-reduced-motion: reduce` を設定している環境では，CSS・JS 双方のアニメーションが自動的に停止します．
- `tests/e2e.test.mjs` は現在の App Router 構成を対象とし，本番ビルドを起動して主要導線を検証します．

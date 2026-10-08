# Portfolio Site

公開サイト: **https://hr0101.dev/**（Cloudflare DNS + AWS S3 / CloudFront）

Swift / SwiftUI で個人開発した iPhone・Mac アプリを紹介する，個人ポートフォリオサイトです．
Next.js 16（App Router）+ TypeScript + Tailwind CSS v4 で構築し，GitHub（[HR0101](https://github.com/HR0101)）の活動を表示します．AWSの公開版ではビルド時に取得したスナップショットを使用し，Node.jsサーバー版ではAPI Routeから動的に取得します．

Node.js 20.19以降（または22.13以降）を使用してください．

## AWSの公開構成

### VMを使わない静的ホスティング

現在の本番環境は **非公開のAmazon S3 + Amazon CloudFront + AWS Certificate Manager（ACM）** です。Next.jsを静的ファイルへ書き出し、CloudFrontから配信します。EC2などのVM、常駐Node.jsサーバー、データベースは使用していません。Dockerはローカル開発・テスト用です。

```mermaid
flowchart LR
    User[訪問者のブラウザ] -->|DNS問い合わせ| DNS[Cloudflare DNS]
    DNS -. hr0101.devの接続先 .-> User
    User -->|HTTPS| CDN[CloudFront]
    ACM[ACM証明書 / us-east-1] -. TLS証明書 .-> CDN
    CDN -->|OAC署名付きHTTPS| S3[非公開S3 / ap-southeast-2]
    CDN --- Function[CloudFront Function / URL変換]
```

Cloudflareは **DNSのみ** で利用し、ルートドメインのCNAMEをCloudFrontへ向けています。Cloudflareのプロキシを経由しないため、Web通信のTLS終端とキャッシュはCloudFrontが担当します。CloudflareのWAFやプロキシ機能による保護を、この構成の実装済み機能としては扱いません。

| 要素 | 現在の設定・役割 |
| --- | --- |
| 公開URL | `https://hr0101.dev/` |
| DNS | Cloudflare。ルートCNAMEをflatteningしてCloudFrontへ接続 |
| 静的ファイル | S3。HTML・JavaScript・CSS・画像・動画・OGPを保存 |
| S3 / CloudFormationのリージョン | `ap-southeast-2`（シドニー） |
| CDN | CloudFront。HTTP/2・HTTP/3・IPv6、圧縮、`PriceClass_200` |
| HTTPS証明書 | ACMの`us-east-1`（バージニア北部）。CloudFront用の証明書はこのリージョンで発行 |
| URL変換 | CloudFront Functionで`/apps/tsumugi/`などをS3の`index.html`へ変換。拡張子のないOGP画像は変換対象から除外 |
| エラーページ | S3の403・404をサイトの`404.html`へ変換してHTTP 404を返す |
| インフラ定義 | [infra/aws/site.yaml](infra/aws/site.yaml)。CloudFormationで再現・更新 |
| VM関連の設定 | vCPU・メモリ・OS・EBS・SSH鍵・Security Group・独自VPCは、このサイトのためには設定しない |

### VM構成との比較と採用理由

アプリ紹介とポートフォリオの閲覧が中心のため、サーバー側でリクエストごとに処理を行う必要が少なく、この構成を採用しています。

| 観点 | 現在のS3 + CloudFront | EC2などのVMで運用する場合 |
| --- | --- | --- |
| 運用作業 | 静的成果物と配信設定を管理。ゲストOS・Webサーバーの保守が不要 | OS更新、Webサーバー・Node.jsの更新、プロセス管理、容量監視が必要 |
| 公開する入口 | CloudFrontのWeb配信。S3は非公開 | Webポートに加え、SSHなどの管理経路とネットワーク制御を設計 |
| アクセス増加 | CDNとマネージドストレージを利用。VM台数の調整が不要 | インスタンス容量、ロードバランサー、Auto Scalingなどを設計 |
| 費用の要因 | 保存量・リクエスト・転送量・キャッシュ更新など | インスタンス稼働時間、ディスク、ネットワーク、必要に応じてLBなど |
| サーバー処理 | 静的ページを配信。API Route・SSR・サーバー保存は実行しない | API・SSR・バックグラウンド処理などを実行可能 |

VMを省くことで、OSやSSH、常駐アプリケーションに対する保守と公開経路を減らせます。一方、フロントエンドの依存パッケージやAWSアカウントの権限管理は継続して必要です。

### 実装済みのセキュリティ対策

| 対策 | 設定と利点 |
| --- | --- |
| S3の公開遮断 | Block Public Accessを4項目すべて有効化。公開ACLや公開バケットポリシーによる直接公開を防ぐ |
| オリジンへのアクセス制御 | OACでSigV4署名を常時使用。バケットポリシーの`AWS:SourceArn`で、このCloudFront配信からの読み取りだけを許可する |
| 通信の暗号化 | 訪問者→CloudFrontはHTTPからHTTPSへリダイレクト。CloudFront→S3もOACの常時署名によりHTTPSを使用 |
| TLS設定 | 独自ドメインの証明書をACMで管理し、CloudFrontの最低TLSポリシーを`TLSv1.2_2021`に設定 |
| 保存時の暗号化 | S3のSSE-S3（AES-256）を設定。保存されたオブジェクトを暗号化する |
| ACLの無効化 | `BucketOwnerEnforced`を使用し、アクセス制御をIAM・バケットポリシーへ集約する |
| HTTPSの継続利用 | HSTSを1年間設定。対応ブラウザが以後HTTPSで接続するよう促す |
| ブラウザ側の制限 | CSP、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`などで埋め込み・外部読み込み・MIME推測を制限する |
| 情報・機能の制限 | `Referrer-Policy`を設定し、Permissions Policyでカメラ・マイク・位置情報などを無効化する |
| 配信メソッドの制限 | CloudFrontでGET・HEADのみ許可。問い合わせフォームはメーラーを起動し、サーバーへ入力内容を保存しない |
| ビルド成果物の確認 | 公開前に必要ファイル・公開URL・秘密情報用ファイル名の混入を検証。ビルド時のトークンは公開用の環境変数にしない |

S3の非公開化はオリジンへの直接アクセスを制限するもので、CloudFrontから配信するサイトや素材は公開コンテンツです。CSPはNext.jsの生成コードに対応するため`'unsafe-inline'`を許可しており、nonce・hashによる厳格なインライン制御は未実装です。公開ファイルの検査もファイル名などの確認であり、任意の文字列に含まれる秘密情報を検出する完全なシークレットスキャンではありません。

設定の根拠: [AWSのOAC仕様](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)、[CloudFrontのHTTPS設定](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-viewers-to-cloudfront.html)、[S3のSSE-S3暗号化](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html)、[CloudFrontの証明書要件](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)。

### キャッシュ・更新・復旧

- ハッシュ付きの`_next/static/`は1年間のimmutableキャッシュ、画像・動画などの素材は5分、HTML・Next.jsのルートデータは毎回再検証に設定します。
- アップロードは素材を先に、HTML・ルートデータを最後に行い、CloudFrontのキャッシュを無効化してから公開URLを検証します。更新中の訪問者のため、古いアセットは自動削除しません。
- 公開確認ではトップページ、3つの詳細ページ、3つのOGP画像、sitemap、robots、404とセキュリティヘッダーを検証します。ブラウザの見た目を自動判定するテストとは異なります。
- CloudFormationスタックを削除・置換してもS3バケットは`Retain`で保持します。ただしS3のVersioning、アクセスログ、専用監視アラーム、WAFルールは現在のテンプレートでは設定していません。
- 復旧は以前のコードや保持済みの成果物を再公開する方式です。S3への更新は複数ファイルのアップロードであり、リリース全体を一度に切り替える仕組みや自動ロールバックは未実装です。

### CI/CDとAWS権限の状態

GitHub ActionsはPR・`main`へのpush・手動実行で、型チェック、Lint、本番ビルド、36件のE2E、静的ビルドと公開URLの検証を行います。検証済み成果物はcommitごとに7日間保存し、公式ActionsはコミットSHAで固定しています。[初回CIは成功済み](https://github.com/HR0101/portfolio_site/actions/runs/37748240819)です。

CDは、その成果物をS3へアップロードしてCloudFrontを更新する処理まで実装済みです。認証はOIDCの短期認証情報を使う設計で、信頼先をこのリポジトリの`main`に限定し、権限を対象S3への一覧取得・書き込み、対象CloudFrontのキャッシュ更新、対象スタックの参照に絞っています。インフラ変更・IAM変更・オブジェクト削除を許可するロールではありません。

**現在、CDは未有効化です。** AWS組織のService Control Policy（SCP）がOIDCプロバイダーの作成を拒否したため、管理者による設定が必要です。`AWS_DEPLOY_ROLE_ARN`が未設定の間はCIを実行し、公開ジョブをスキップします。ロールの設計と有効化手順は [infra/aws/CI-CD.md](infra/aws/CI-CD.md)、手動での公開・接続手順は [DEPLOY.md](DEPLOY.md) を参照してください。

### コストと静的公開の制約

VMの常時稼働費用はありませんが、S3・CloudFront・CloudFront Functionsの利用量に応じた料金とドメインの更新費用が発生します。AWSの無料プランやクレジットには期限があるため、継続公開時はアカウントのプラン・残高・利用量を確認してください。古いアセットを保持する設計なので、保存量も定期的に確認します。

`hr0101.dev`は2026-10-08に取得し、管理画面で有効期限2027-10-08・更新価格年12.20米ドル・自動更新オフを確認しています。更新時は最新の価格・税・期限を確認してください。ACMの証明書更新に必要なDNS検証CNAMEは残します。

GitHub情報は再ビルド時に更新し、取得失敗時は既存スナップショットを使用します。閲覧のたびに最新情報を取得する方式ではありません。API Route・SSR・ログイン・サーバーへのフォーム保存などが必要になった場合は、別途バックエンドと認証・データ管理を設計します。

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

`.github/workflows/ci.yml` がmainへのpush・Pull Request・手動実行で `typecheck → lint → build → test → 静的ビルド → 公開用ファイル検証` を実行します．
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

BusTimeAppの詳細ページには実画面24枚を使用しています。時間帯・季節・夜の雨を10場面で切り替えるギャラリーと、時刻表・通知・Live Activity・土日祝・大きな文字・英語／中国語・設定の7つの機能紹介があります。画像はWebPで配信し、選択すると拡大、Escapeキーで閉じられます。雨の紹介には元スクリーンショットの21番（夜の強い雨）と22番（冬の夜の雨）を採用しています。

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

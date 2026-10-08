# デプロイ手順（AWS）

## 公開済みサイト（2026-10-08）

- 公開URL: https://hr0101.dev/
- CloudFront URL: https://d1ib5a7bh80gnd.cloudfront.net/
- AWSプロジェクト: Array of Sunshine（アカウント `061534656994`）
- S3 / CloudFormationリージョン: `ap-southeast-2`（シドニー）
- CloudFormationスタック: `rhara-portfolio`
- CloudFront配信ID: `EJZ7WFWK76LQZ`
- S3バケット: `rhara-portfolio-sitebucket-n3hu448orwdn`

トップページ、3つの詳細ページ、3つのOGP画像、sitemap、robots、404、セキュリティヘッダーの公開HTTP検証に成功しました。Chromeでトップページの表示も確認済みです。S3は非公開で、CloudFront OACからのみ読み取りを許可しています。

今回のGitHub API取得はHTTP 403のため、既存の `src/data/github-snapshot.json`（2026-09-07生成）を使用しています。サイトは静的公開なので、GitHub情報の更新は再ビルド時に行います。

AWSコンソールで無料プランの残高100ドル・期限2027-04-08の表示を確認しました。継続利用時はAWS Settingsでプラン・残高・期限を確認してください。有料プランへの変更は行っていません。独自ドメインはユーザーがCloudflareで購入しました。

## 自動公開（S3 + CloudFront）

GitHub ActionsのCI/CD構成とAWS接続の設定状況は [infra/aws/CI-CD.md](infra/aws/CI-CD.md) を参照してください。CIはPRとmainで実行します。CDはAWS組織ポリシーによるOIDC作成制限の解除と `AWS_DEPLOY_ROLE_ARN` の設定待ちです。

### Cloudflare独自ドメインの接続（完了）

2026-10-08にユーザーがCloudflareで `hr0101.dev` を購入。購入後の管理画面でアクティブ・有効期限2027-10-08・更新価格年12.20米ドル・自動更新オフを確認しました。初年度の購入前小計表示は8.20米ドル（税別）でした。

AWS ACM証明書: `arn:aws:acm:us-east-1:061534656994:certificate/db7526ee-41a3-4603-b2e5-ca8c9dc6ba43`（DNS検証済み）。更新のため検証CNAMEは残します。

独自ドメインでの10ルートのHTTP検証・HTTPS・canonical URL確認を完了しています。

| Cloudflare DNS名 | タイプ | 値 | プロキシ |
| --- | --- | --- | --- |
| `@` | CNAME | `d1ib5a7bh80gnd.cloudfront.net` | DNSのみ |
| `_ea67b2ee5e59b31aaeeb60d02b8a8bda` | CNAME | `_bb5ad3d06b857437e6c18a15bcefb16f.wzccmgtwzk.acm-validations.aws` | DNSのみ |

接続手順:

1. ACMの `us-east-1` でドメインの証明書を申請し、DNS検証のCNAMEをCloudflareに「DNSのみ」で追加する。
2. 証明書が `ISSUED` になったら、以下でCloudFrontの別名・証明書とサイト内の公開URLを更新する。
3. CloudflareでルートドメインのCNAMEを `d1ib5a7bh80gnd.cloudfront.net` に向け、「DNSのみ」にする（ルートのCNAME flatteningを使用）。
4. 独自ドメインのHTTPS、ページ、OGP、sitemap、robotsを確認する。

```bash
AWS_CUSTOM_DOMAIN=hr0101.dev \
AWS_CERTIFICATE_ARN=arn:aws:acm:us-east-1:061534656994:certificate/db7526ee-41a3-4603-b2e5-ca8c9dc6ba43 \
npm run deploy:aws
```

別ドメインを使う場合、証明書ARNは実際に発行されたものに置き換えてください。ドメインと証明書の指定は必ず両方行います。その後の通常デプロイはCloudFormationの既存パラメーターを引き継ぎます。独自ドメイン対応テンプレートのAWS検証とデプロイスクリプトの構文検証を完了しました。

参照: [CloudFrontの証明書要件](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)、[CloudflareのCNAME flattening](https://developers.cloudflare.com/dns/cname-flattening/)。

AWS CLI の認証後、次のコマンドでリソース構築、静的ビルド、アップロード、キャッシュ更新、公開HTTP確認まで実行できます。

```bash
# 使用するアカウントでAWS CLIにログインする（ブラウザのコンソールログインとは別）
aws login --region ap-southeast-2

# 認証とCloudFormationテンプレートを検証する。リソースは作成しない
npm run deploy:aws:preflight

# 既定のシドニーリージョンで同じサイトを更新。完了時にHTTPSの公開URLを表示
npm run deploy:aws

# 名前付きプロファイルやリージョンを指定する場合
AWS_PROFILE=my-profile AWS_REGION=us-east-1 npm run deploy:aws
```

`infra/aws/site.yaml` が非公開S3、OAC、CloudFront、詳細ページ用URL変換、セキュリティヘッダーを作成します。IAMロール・EC2・データベースは作成しません。既定スタック名は `rhara-portfolio`、`AWS_STACK_NAME` で変更できます。同じアカウント・リージョン・スタック名で再実行すると同じサイトを更新します。

公開ドメインの確定後に `NEXT_PUBLIC_SITE_URL` を設定して再ビルドするため、canonical・sitemap・OGPに公開URLが反映されます。静的公開のGitHub情報はビルド時のスナップショットです。取得できなければ既存のスナップショットを使います。

S3、CloudFront、CloudFront Functionsの利用料はアカウントの料金プランと利用量に従って発生します。独自ドメインの購入や有料プランへの変更は行いません。CloudFrontの反映には数分かかることがあります。

アップロードはハッシュ付きの `_next/static/` のみ長期キャッシュし、HTMLは再検証、画像・動画などは5分キャッシュにします。拡張子のない各OGP画像にもPNGのContent-Typeを付けます。更新中のアクセスのため古いアセットは自動削除しません。CloudFormationスタックを削除してもS3バケットとファイルは保持します。

AWS側の検証にはCloudFormation、S3、CloudFrontを操作できる認証情報が必要です。最終アップロード後はトップ、3つの詳細ページ、OGP、sitemap、robots、404とセキュリティヘッダーを確認します。AWSの認証前にも `npm run deploy:aws:check` でローカルの `out/` を確認できます。

構成の根拠: [AWS OAC仕様](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-originaccesscontrol.html)、[CloudFront Functions仕様](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-function.html)、[レスポンスヘッダーポリシー](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/creating-response-headers-policies.html)。

このサイトは **2通りの形**で書き出せます．どちらを選ぶかは，使える AWS アカウントの種類で決まります．

| 形式 | コマンド | 出力 | サーバー | GitHub の情報 |
| --- | --- | --- | --- | --- |
| サーバーあり | `npm run build` | `.next/` | Node が必要 | 閲覧のたびに API から取得（1時間キャッシュ） |
| **静的ファイル** | `npm run build:static` | `out/` | **不要** | **ビルド時のスナップショット**を同梱 |

---

## 先に確認：Educate／Academyの利用環境

**AWS Educate**にはAWSコンソールを使う学習用ハンズオンLabがありますが、教材へのログインだけでは、このサイトを公開できる環境があるとは確認できません。利用するLabの対応サービス・権限・保存期間を確認してください。**AWS Academy Learner Lab**は授業の課題用にAWSサービスを操作する環境で、利用できるサービスに制限があります。

参照: [AWS Educate](https://aws.amazon.com/education/awseducate/)、[AWS Academy Learner Lab](https://aws.amazon.com/training/awsacademy/)。

当初確認したAWS Educateの「ストレージ入門」はAmazon S3のシミュレーションでした。その後、ユーザーが新規作成したAWSプロジェクトで認証し、上記のS3 + CloudFront構成で実公開を完了しています。

デプロイできるのは，次のいずれかを持っている場合です．

| 持っているもの | 可否 | 向いている方式 |
| --- | --- | --- |
| AWS Educate（教材ログインのみ） | 未確認 | Labの権限・サービス・保存期間を確認 |
| **AWS Academy Learner Lab**（授業で配布されるサンドボックス） | △ 条件付き | S3 + CloudFront（静的） |
| 通常の AWS アカウント（無料利用枠・クレジット含む） | ✓ 可 | Amplify Hosting または S3 + CloudFront |

**AWS Academy Learner Lab の注意点**
- セッション終了・授業終了時のリソース保存期間をLabの説明で確認してください
- IAMロール、リージョン、利用サービスの制限は配布されたLabの説明に従ってください
- S3 + CloudFrontの静的配信はIAMロール・Lambdaを必要としませんが、CloudFront FunctionsやCloudFormationが使えるかは実際の環境で確認が必要です

---

## 方式A：S3 + CloudFront（静的・推奨）

サーバーを動かさず静的ファイルを配信します。利用可否と費用はアカウントの権限・料金プラン・利用量に依存します。

### 1. 書き出す

```bash
npm run build:static      # out/ に書き出される（約46MB：動画と画像を含む）
```

`GITHUB_TOKEN` を設定しておくと，Contribution Graph（草）も取り込まれます．

```bash
GITHUB_TOKEN=ghp_xxx npm run build:static
```

### 2. S3 バケットを用意する

```bash
aws s3 mb s3://<バケット名> --region us-east-1
```

**バケットは非公開のまま**にし，CloudFront の OAC（Origin Access Control）経由で配信します（S3 を公開設定にする方法は，多くの教育用アカウントで組織ポリシーによりブロックされます）．

### 3. アップロードする

```bash
# HTML は都度確認，それ以外は長期キャッシュ
aws s3 sync out/ s3://<バケット名>/ --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.html" --exclude "*.txt"

aws s3 sync out/ s3://<バケット名>/ \
  --cache-control "public,max-age=0,must-revalidate" \
  --exclude "*" --include "*.html" --include "*.txt"

# 拡張子のない OGP 画像だけ Content-Type を明示する
aws s3 cp out/opengraph-image s3://<バケット名>/opengraph-image \
  --content-type "image/png" --cache-control "public,max-age=31536000,immutable"
```

### 4. CloudFront を作る

- オリジン：作成した S3 バケット（**OAC を有効化**）
- デフォルトルートオブジェクト：`index.html`
- エラーページ：`403` と `404` → `/404.html`（ステータス404）
- **レスポンスヘッダーポリシー**：静的書き出しでは `next.config.mjs` の `headers()` が効かないため，同じ内容を CloudFront 側で設定します．

| ヘッダー | 値 |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; base-uri 'self'; connect-src 'self' https://api.github.com; font-src 'self' data:; form-action 'self' mailto:; frame-ancestors 'none'; img-src 'self' data: blob: https://ghchart.rshah.org; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

### 5. 公開 URL を設定して再ビルド

OGP 画像や `sitemap.xml` の絶対 URL に使うため，確定した URL を入れて**もう一度**書き出します．

```bash
NEXT_PUBLIC_SITE_URL=https://<配信ドメイン> npm run build:static
```

### 更新のたびに

```bash
npm run build:static
aws s3 sync out/ s3://<バケット名>/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

---

## 方式B：AWS Amplify Hosting（サーバーあり）

サーバー機能を残したい場合の候補です。ただし、このサイトが使用するNext.js 16がAmplify Hostingで対応済みかを[AWSの対応表](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)で先に確認してください。確認時点の対応表はNext.js 15までを記載しているため、今回の自動公開はS3 + CloudFrontを使います。

- ビルドコマンド：`npm run build`
- 出力ディレクトリ：`.next`
- 環境変数：`NEXT_PUBLIC_SITE_URL`（公開URL），必要なら `GITHUB_TOKEN`

※ Amplify は内部で Lambda・IAM ロール・CloudFormation を作成するため，**Learner Lab など権限が制限されたアカウントでは失敗します**．

---

## 代替案（AWS が使えない場合）

静的書き出し（`out/`）はどこにでも置けます．いずれも無料枠で公開でき，独自ドメインも設定できます．

- **Cloudflare Pages** — `out/` をそのまま配置，ヘッダーは `_headers` ファイルで指定
- **GitHub Pages** — 同じリポジトリから公開（`out/` を `gh-pages` ブランチへ）
- **Vercel** — Next.js の開発元．`npm run build` のままサーバー機能ごと動く

---

## 静的書き出しの制約（把握しておくこと）

- **GitHub セクションはビルド時点の内容**になります（`npm run build:static` を実行し直すと更新）．
- API ルート（`/api/github/*`）は書き出しに含まれません．書き出し中だけ自動で退避しています（`scripts/build-static.mjs`）．
- `next.config.mjs` の `headers()` は無効です．上の表のとおり CloudFront 側で設定してください．
- URL は末尾スラッシュ付き（`/apps/bustimeapp/`）になります．

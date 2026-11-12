# デプロイ手順

## 公開：Cloudflare Pages（Git 連携）

`main` に push すると，Cloudflare Pages が GitHub から取得してビルドし，https://hr0101.dev/ に公開します．ビルドコマンドの中で型・lint・本番ビルド・E2E・書き出し検証まで実行するので，**テストが落ちたら公開されません**．AWS のキーや Cloudflare の API トークンは使いません．

AWS（S3 + CloudFront）から移した理由：AWS の無料プランのプロジェクトアカウントは，AWS 管理の SCP が `iam:*Provider*` を拒否するため GitHub の OIDC を作れず，キーなしの自動公開ができないため．

### Cloudflare 側の設定

| 項目 | 値 |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run check && npm run build:static && npm run deploy:aws:check` |
| Build output directory | `out` |
| 環境変数 | `NODE_VERSION=22`，`NEXT_PUBLIC_SITE_URL=https://hr0101.dev`，`NEXT_TELEMETRY_DISABLED=1` |
| カスタムドメイン | `hr0101.dev` |

- 改名前の紹介ページ（`/apps/allserverformac`）から `/apps/arkserver` への恒久転送は `public/_redirects` で指定する（静的書き出しでは `next.config.mjs` の `redirects()` が効かないため．同じ内容を両方に置いている）．
- セキュリティヘッダー・`_next/static/` の長期キャッシュ・拡張子のない OGP 画像の `Content-Type` は `public/_headers` で指定する（書き出し時に `out/_headers` へコピーされる）．CSP を変えるときは `next.config.mjs` と両方をそろえる．
- `404.html` は Pages が自動で使う．`/apps/bustimeapp/` のような末尾スラッシュ付きの URL もそのまま配信される．
- PR やブランチへの push ごとに `*.pages.dev` のプレビューが作られる（本番には影響しない）．
- Cloudflare のビルドでは GitHub API が回数制限で拒否されやすく，その場合は `src/data/github-snapshot.json` を使う．GitHub セクションを更新するときは，ローカルで `GITHUB_TOKEN=... node scripts/fetch-github-snapshot.mjs` を実行してコミットする．
- GitHub Actions（`.github/workflows/ci.yml`）は PR の確認用として同じ検証を実行する．

---

## 動的 API（Pages Functions）

静的な画面は引き続き `out/` に書き出し，同じオリジンの API はリポジトリ直下の `functions/` で動かします．Cloudflare Pages の Git 連携・ビルドコマンド・出力ディレクトリは変更しません．`wrangler.toml` は作らず，Secret は Cloudflare ダッシュボードで管理します．

| URL | Pages ラッパー | 共通ロジック | 共有キャッシュ |
| --- | --- | --- | --- |
| `/api/github` | `functions/api/github/index.ts` | `src/lib/edge/github.ts` | 600 秒 |
| `/api/github/activity` | `functions/api/github/activity.ts` | 同上 | 300 秒 |
| `/api/github/contributions` | `functions/api/github/contributions.ts` | 同上 | 1800 秒 |
| `/api/music/recent` | `functions/api/music/recent.ts` | `src/lib/edge/appleMusic.ts` | 120 秒 |

`src/lib/edge/http.ts` が Cache API と `Cache-Control`，クエリを除いたキー，JSON 応答を共通化します．GET は HTTP 200 と `apiStatus` で結果を伝え，GET 以外は 405 にします．CORS は付けません．`src/app/api/` の Next ルートも同じロジックを呼びます．`scripts/build-static.mjs` はこのディレクトリ全体を一時退避するため，新しい音楽ルートも静的書き出しに混ざりません．

GitHub は期限内の localStorage キャッシュを使い，なければ API を呼び，取得失敗時は `src/data/github-snapshot.json` に戻ります．イベントのブラウザキャッシュは 10 分，リポジトリと草は 1 時間です．草の snapshot もなければ既存の外部画像へ戻ります．Apple Music は Profile の集計行が画面に近づいたときに取得し，成功かつ曲がある場合だけ表示します．ブラウザキャッシュは 5 分です．

### Cloudflare の Secret

Cloudflare Pages の対象プロジェクトの設定で，Production と必要な Preview 環境に以下を Secret として登録します．値を `NEXT_PUBLIC_*` へ入れないでください．

| 名前 | 用途 |
| --- | --- |
| `GITHUB_TOKEN` | GitHub の公開 REST API の制限緩和と，草の GraphQL 認証 |
| `APPLE_MUSIC_TEAM_ID` | Developer Token の発行者 |
| `APPLE_MUSIC_KEY_ID` | MusicKit 署名鍵の識別 |
| `APPLE_MUSIC_PRIVATE_KEY` | MusicKit の PKCS#8 PEM 署名鍵 |
| `APPLE_MUSIC_USER_TOKEN` | 本人の最近聴いた曲を取得する認可 |

Apple の 4 項目が欠けると `no_token` で非表示になります．GitHub の草もトークンなしでは `no_token` です．公開リポジトリ・公開イベントは，既存どおりトークンなしでも匿名で取得します．Developer Token は WebCrypto の ES256 で有効期間 12 時間として署名し，期限の 5 分前までメモリ内で再利用します．PEM の改行は，文字列の `\n` でも扱えます．

### Apple 側の準備と Music User Token の取得

1. Apple Developer の Certificates, Identifiers & Profiles → Keys で，MusicKit を有効にしたキーを作成します．Team ID と Key ID を控えます．`.p8` は一度しかダウンロードできないため，安全に保管してください．
2. `.dev.vars.example` を `.dev.vars` へコピーし，Team ID・Key ID・秘密鍵をローカルで設定します．秘密鍵は引用符で囲んだ 1 行の PEM（改行は `\n`）でも設定できます．これらはシェル環境変数でも渡せます．`.dev.vars` と `AuthKey_*.p8` は Git の対象外です．
3. 次のコマンドでローカル認可サーバーを起動し，表示された `http://127.0.0.1:8787` をブラウザで開きます．

```bash
node scripts/apple-music-user-token.mjs
# PEM を環境変数へ入れず，ファイルから読む場合
node scripts/apple-music-user-token.mjs --key-file ./AuthKey_XXXX.p8
```

4. 「Apple Music で認可する」を押し，画面に表示された Music User Token をコピーして Cloudflare の `APPLE_MUSIC_USER_TOKEN` Secret を更新します．他の 3 項目も登録します．作業後はページを閉じ，Ctrl+C でサーバーを終了します．スクリプトはトークンや鍵をファイル・ログ・URL へ出さず，`127.0.0.1` だけで待ち受けます．MusicKit JS はこのローカル認可ページだけで読み込みます．
5. Music User Token は約 6 か月で失効する想定です．401 / 403 は `token_expired` として非表示にするため，再認可して Secret を更新してください．401 / 403 だけでは User Token と Developer Token のどちらが原因かは判別できないので，署名鍵や MusicKit の設定も確認してください．

Apple API は `{ data: [{ id, type: 'songs' または 'library-songs', attributes: { name, artistName, albumName, artwork: { url }, url? } }] }` を想定しています．この環境では公式ドキュメント・実 API に接続できておらず，エンドポイント，実際の応答，MusicKit v3 の認可，利用アカウントでの権限と有効期間は未確認です．想定外の形は空配列へ倒します．公開するのは曲名・アーティスト・アルバム・検証済みの画像 URL と任意の Apple Music URL だけで，ID・再生日時・その他の属性は返しません．ジャケットは HTTPS の `*.mzstatic.com`，曲のリンクは `https://music.apple.com/` 配下に限定します．

### GitHub トークン

GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens で，対象アカウントの公開リポジトリの読み取りだけに限定したトークンを作成します．書き込み権限は付けず，公開リポジトリの基本情報の取得に必要な最小権限にします．草の GraphQL を利用するアカウントで取得できることも確認して，`GITHUB_TOKEN` Secret に登録してください．

### ローカル確認

Next の開発サーバーでは `.env.local.example` を元に `.env.local` を設定します．Pages Functions を試す場合は `.dev.vars` に値を設定し，開発サーバーを停止してから次を実行します．本作業ではビルドも wrangler も実行していません．

```bash
npm run build:static
npx wrangler pages dev out
```

`wrangler` は別途利用できる環境が必要です．通常のサイトは MusicKit JS を読み込まず，音楽取得も同じオリジン経由なので，CSP の `connect-src` は既存のままです．画像用の `https://*.mzstatic.com` は `next.config.mjs` と `public/_headers` の両方へ追加しています．

---

## 旧構成：AWS（S3 + CloudFront）

以下は Cloudflare Pages へ移す前の記録です．S3・CloudFront のリソースは移行確認後に扱いを決めます．

### 公開済みサイト（2026-10-08）

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

- Pages Functions のない配信先では，GitHub セクションは同梱 snapshot の内容へ戻ります．Cloudflare Pages では動的 API を先に利用します．
- Next の API ルート（`src/app/api/` 全体）は書き出しに含まれません．書き出し中だけ自動で退避しています（`scripts/build-static.mjs`）．Pages Functions は別途配信されます．
- `next.config.mjs` の `headers()` は無効です．上の表のとおり CloudFront 側で設定してください．
- URL は末尾スラッシュ付き（`/apps/bustimeapp/`）になります．

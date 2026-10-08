# GitHub ActionsからAWSへ公開する接続

`.github/workflows/ci.yml` はPR・mainへのpush・手動実行で型、Lint、本番ビルド、36件のE2E、静的ビルド、公開URLを検証し、commitごとの静的成果物を7日間保存します。

mainの検証成功後、OIDCで限定権限のAWSロールを引き受け、同じ成果物を既存S3へアップロードします。CloudFrontのキャッシュ更新後、HTTPSで10ルートを検証します。インフラ変更・IAM変更・ファイル削除はデプロイロールに許可しません。Actionsは公式リポジトリのコミットSHAで固定しています。

## 現在のブロッカー

AWSアカウント `061534656994` の `AccountFullAccessRole` は組織のSCPにより `iam:ListOpenIDConnectProviders` と `iam:CreateOpenIDConnectProvider` を明示的に拒否されました。CloudFormationからの作成も拒否され、`rhara-portfolio-github-actions` はロールバックしました。このためOIDC接続は未完了です。変数 `AWS_DEPLOY_ROLE_ARN` が未設定の場合、CIは実行し、CDはスキップして実行サマリーに理由を表示します。

AWS組織管理者による必要なIAM操作の許可、または管理者によるOIDCプロバイダー・ロールの作成が必要です。サイトの公開済みリソースは稼働しています。アクセスキーで制限を回避することは行いません。

## 管理者が接続を設定する手順

`github-actions.yaml` は現在のリポジトリID・所有者IDを含むmainブランチのOIDC subjectだけを信頼します。このリポジトリは2026-09-03作成のため、2026-07-15以降のID付きsubject形式を使用しています。subjectのカスタマイズを行う場合は `GitHubSubject` を実際の設定に合わせてください。

1. IAMのOIDCプロバイダー作成、ロール作成・インラインポリシー設定・CloudFormation管理に必要な権限を管理者が許可します。
2. 失敗した空のCloudFormationスタックが `ROLLBACK_COMPLETE` の場合、管理者が削除してから同じ名前で再作成します。既存プロバイダーがある場合は `ExistingProviderArn` にそのARNを渡します。
3. 次のテンプレートをデプロイします。

```bash
aws cloudformation deploy \
  --template-file infra/aws/github-actions.yaml \
  --stack-name rhara-portfolio-github-actions \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-2

aws cloudformation describe-stacks \
  --stack-name rhara-portfolio-github-actions \
  --query 'Stacks[0].Outputs' --region ap-southeast-2
```

4. 出力の `RoleArn` をGitHubリポジトリのActions変数 `AWS_DEPLOY_ROLE_ARN` に設定します（ARNは秘密鍵ではありません）。
5. mainでCI / CDを手動実行し、Deploy to AWSが成功することを確認します。

```bash
gh variable set AWS_DEPLOY_ROLE_ARN \
  --repo HR0101/portfolio_site \
  --body arn:aws:iam::061534656994:role/rhara-portfolio-github-publish
gh workflow run ci.yml --repo HR0101/portfolio_site --ref main
```

CIで作成した成果物の公開処理は `npm run deploy:aws:publish` です。通常の `npm run deploy:aws` は引き続きローカル管理者向けにインフラ更新とビルドを行います。

公式仕様: [GitHubのAWS OIDC設定](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)、[AWS認証Action](https://github.com/aws-actions/configure-aws-credentials)。

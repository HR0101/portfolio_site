import { spawnSync } from 'node:child_process';
import { readdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-2';
const stack = process.env.AWS_STACK_NAME || 'rhara-portfolio';
if (!/^[a-zA-Z][a-zA-Z0-9-]{0,39}$/.test(stack)) throw new Error('AWS_STACK_NAME は英字で始まる40文字以内の英数字・ハイフンで指定してください。');
const preflight = process.argv.includes('--preflight');
const checkLocal = process.argv.includes('--check-local');
const publishOnly = process.argv.includes('--publish-only');
const customDomain = process.env.AWS_CUSTOM_DOMAIN || '';
const certificateArn = process.env.AWS_CERTIFICATE_ARN || '';
if (Boolean(customDomain) !== Boolean(certificateArn)) throw new Error('AWS_CUSTOM_DOMAIN と AWS_CERTIFICATE_ARN は両方指定してください。');
if (customDomain && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(customDomain)) throw new Error('AWS_CUSTOM_DOMAIN は小文字のドメイン名で指定してください。');
if (certificateArn && !/^arn:aws:acm:us-east-1:\d{12}:certificate\/[a-f0-9-]+$/.test(certificateArn)) throw new Error('CloudFront用の証明書はus-east-1のACM ARNを指定してください。');

function run(command, args, { capture = false, env = {} } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    env: { ...process.env, AWS_PAGER: '', ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} が失敗しました（終了コード ${result.status}）。`);
  return capture ? result.stdout.trim() : undefined;
}
const aws = (args, options) => run('aws', [...args, '--region', region, '--no-cli-pager'], options);

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(target));
    else result.push(target);
  }
  return result;
}

async function verifyExport(siteUrl) {
  const output = path.join(root, 'out');
  const required = ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'opengraph-image',
    'apps/bustimeapp/index.html', 'apps/subghost/index.html', 'apps/tsumugi/index.html'];
  for (const file of required) {
    if (!(await stat(path.join(output, file))).size) throw new Error(`空の公開ファイル: ${file}`);
  }
  for (const file of ['index.html', 'sitemap.xml', 'robots.txt']) {
    const content = await readFile(path.join(output, file), 'utf8');
    if (siteUrl && !content.includes(siteUrl)) throw new Error(`${file} の公開URLが一致しません。`);
    if (siteUrl && content.includes('http://localhost:3001')) throw new Error(`${file} にlocalhostが残っています。`);
  }
  const allFiles = await files(output);
  if (allFiles.some(file => /(?:^|\/)\.env|\.pem$|\.key$/.test(file))) throw new Error('公開ファイルに秘密情報用ファイルが含まれています。');
  console.info(`静的出力を確認しました（${allFiles.length}ファイル）。`);
  return allFiles;
}

async function verifyLive(url) {
  const checks = [
    ['/', 200, 'text/html'], ['/apps/bustimeapp/', 200, 'text/html'],
    ['/apps/subghost/', 200, 'text/html'], ['/apps/tsumugi/', 200, 'text/html'],
    ['/opengraph-image', 200, 'image/png'], ['/apps/subghost/opengraph-image', 200, 'image/png'],
    ['/apps/tsumugi/opengraph-image', 200, 'image/png'],
    ['/sitemap.xml', 200, 'xml'], ['/robots.txt', 200, 'text/plain'],
    ['/__deployment_missing_page__/', 404, 'text/html'],
  ];
  for (const [route, status, type] of checks) {
    const response = await fetch(`${url}${route}`, { signal: AbortSignal.timeout(30000) });
    if (response.status !== status || !response.headers.get('content-type')?.includes(type)) {
      throw new Error(`公開確認失敗: ${route} (${response.status}, ${response.headers.get('content-type')})`);
    }
    if (!response.headers.has('content-security-policy') || response.headers.get('x-content-type-options') !== 'nosniff') {
      throw new Error(`セキュリティヘッダーがありません: ${route}`);
    }
    if (route === '/') {
      const html = await response.text();
      if (!html.includes(url)) throw new Error('公開HTMLのcanonical URLが一致しません。');
    } else await response.arrayBuffer();
    console.info(`確認済み: ${route} → ${status}`);
  }
}

async function main() {
  if (checkLocal) {
    await verifyExport(process.env.NEXT_PUBLIC_SITE_URL);
    return;
  }
  const identity = JSON.parse(aws(['sts', 'get-caller-identity', '--output', 'json'], { capture: true }));
  console.info(`AWS アカウント: ${identity.Account} / リージョン: ${region} / スタック: ${stack}`);
  if (!publishOnly) aws(['cloudformation', 'validate-template', '--template-body', 'file://infra/aws/site.yaml'], { capture: true });
  if (preflight) {
    console.info('認証・テンプレート検証完了。AWSリソースは作成していません。');
    return;
  }
  if (!publishOnly) {
    // Catch compilation failures before creating paid resources. The final build uses the assigned URL.
    run('npm', ['run', 'typecheck']);
    run('npm', ['run', 'lint']);
    run('npm', ['run', 'build:static']);
    await verifyExport();
    aws(['cloudformation', 'deploy', '--template-file', 'infra/aws/site.yaml', '--stack-name', stack,
      '--no-fail-on-empty-changeset', '--tags', 'Project=portfolio-site',
      ...(customDomain ? ['--parameter-overrides', `SiteDomainName=${customDomain}`, `CertificateArn=${certificateArn}`] : [])]);
  }
  const outputs = JSON.parse(aws(['cloudformation', 'describe-stacks', '--stack-name', stack,
    '--query', 'Stacks[0].Outputs', '--output', 'json'], { capture: true }));
  const values = Object.fromEntries(outputs.map(item => [item.OutputKey, item.OutputValue]));
  const { BucketName: bucket, DistributionId: distribution, SiteUrl: url } = values;
  if (!bucket || !distribution || !url) throw new Error('CloudFormation の出力が不足しています。');
  if (!publishOnly) run('npm', ['run', 'build:static'], { env: { NEXT_PUBLIC_SITE_URL: url } });
  const exported = await verifyExport(url);
  // Mutable public assets must not be cached forever; only content-hashed Next assets are immutable.
  // Keep old hashed assets so in-flight visitors can finish loading the previous release.
  aws(['s3', 'sync', 'out/', `s3://${bucket}/`, '--exclude', '*.html', '--exclude', '*.txt',
    '--exclude', '_next/static/*', '--exclude', '*opengraph-image', '--cache-control', 'public,max-age=300', '--no-progress']);
  aws(['s3', 'sync', 'out/_next/static/', `s3://${bucket}/_next/static/`,
    '--cache-control', 'public,max-age=31536000,immutable', '--no-progress']);
  for (const file of exported.filter(file => path.basename(file) === 'opengraph-image')) {
    const key = path.relative(path.join(root, 'out'), file).split(path.sep).join('/');
    aws(['s3', 'cp', file, `s3://${bucket}/${key}`, '--content-type', 'image/png', '--cache-control', 'public,max-age=300', '--no-progress']);
  }
  // Publish HTML after its assets have been uploaded.
  aws(['s3', 'sync', 'out/', `s3://${bucket}/`, '--exclude', '*', '--include', '*.html', '--include', '*.txt',
    '--cache-control', 'public,max-age=0,must-revalidate', '--no-progress']);
  const invalidation = JSON.parse(aws(['cloudfront', 'create-invalidation', '--distribution-id', distribution,
    '--paths', '/*', '--output', 'json'], { capture: true }));
  aws(['cloudfront', 'wait', 'invalidation-completed', '--distribution-id', distribution, '--id', invalidation.Invalidation.Id]);
  await verifyLive(url);
  console.info(`\n公開完了: ${url}`);
}

main().catch(error => {
  console.error(`\nAWS公開を完了できませんでした: ${error.message}`);
  process.exitCode = 1;
});

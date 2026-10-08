/**
 * 静的ファイル（out/）として書き出すためのビルドスクリプト．
 *
 *   npm run build:static
 *
 * サーバーを動かせない場所（S3 + CloudFront など）へ置くための形式で書き出す．
 * GitHub の API ルートはサーバーが必要なため，書き出しの間だけ退避させる．
 * 画面側は，代わりにビルド時のスナップショット（src/data/github-snapshot.json）を読む．
 */

import { rename, rm, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const API_DIR = path.join(projectRoot, 'src', 'app', 'api');
// 書き出し中の退避先（app/ の外に出さないと Next がページとして扱ってしまう）
const PARKED_DIR = path.join(projectRoot, '.api-parked');

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
      shell: false,
    });
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} が終了コード ${code} で終了しました`)),
    );
    child.on('error', reject);
  });
}

async function main() {
  if (await exists(PARKED_DIR)) {
    throw new Error('API の退避ディレクトリが存在します。同時ビルドを止め、.api-parked を src/app/api へ復元してから再実行してください。');
  }
  // ビルド時点の GitHub 情報を取り込む（失敗しても既存のスナップショットで続行する）
  await run('node', ['scripts/fetch-github-snapshot.mjs']);
  await rm(path.join(projectRoot, 'out'), { recursive: true, force: true });
  // 前回のビルドで生成された型情報が残っていると，退避した API ルートを参照して失敗するため消す
  await rm(path.join(projectRoot, '.next'), { recursive: true, force: true });

  const hasApiRoutes = await exists(API_DIR);
  if (hasApiRoutes) {
    await rename(API_DIR, PARKED_DIR);
    console.info('・API ルートを一時退避しました（静的書き出しでは使えないため）');
  }

  try {
    await run('npx', ['next', 'build'], {
      STATIC_EXPORT: '1',
      NEXT_PUBLIC_STATIC_EXPORT: '1',
    });
  } finally {
    // 成功・失敗にかかわらず必ず元へ戻す
    if (hasApiRoutes) {
      await rename(PARKED_DIR, API_DIR);
      console.info('・API ルートを元に戻しました');
    }
  }

  console.info('\n✓ out/ に静的ファイルを書き出しました');
}

main().catch((error) => {
  console.error('\n✗ 静的書き出しに失敗しました:', error.message);
  process.exit(1);
});

/**
 * Apple Music の Music User Token をローカルの画面で取得する．
 * .dev.vars またはシェル環境に APPLE_MUSIC_TEAM_ID / APPLE_MUSIC_KEY_ID /
 * APPLE_MUSIC_PRIVATE_KEY を設定して node scripts/apple-music-user-token.mjs を実行する．
 * 鍵ファイルを使う場合は --key-file ./AuthKey_XXXX.p8 を付ける．
 * http://127.0.0.1:8787 をブラウザで開き，認可後の値を Secret へコピーする．
 * 値・鍵は保存せず，ログや URL に載せない．終了は Ctrl+C．
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createSign } from 'node:crypto';

const hostname = '127.0.0.1';
const port = 8787;
const origin = `http://${hostname}:${port}`;
// MusicKit の認可は localhost のほうが通りやすいので，同じ自分のマシンの別名も許可する（待ち受けは 127.0.0.1 のまま）．
const allowedOrigins = new Set([origin, `http://localhost:${port}`]);
const allowedHosts = new Set([`${hostname}:${port}`, `localhost:${port}`]);
const tokenLifetimeSeconds = 12 * 60 * 60;

// dotenv の依存を増やさず，空値・引用符・エスケープした PEM に対応する．
async function readDevVars() {
  try {
    const source = await readFile(new URL('../.dev.vars', import.meta.url), 'utf8');
    const values = {};
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      else value = value.replace(/\s+#.*$/, '').trim();
      values[match[1]] = value.replace(/\\n/g, '\n');
    }
    return values;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error('ローカル設定を読み込めませんでした');
  }
}

async function makeDeveloperToken() {
  const values = { ...await readDevVars(), ...process.env };
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--key-file' || !args[1])) throw new Error('引数の形式が不正です');
  const privateKey = args.length ? await readFile(args[1], 'utf8') : values.APPLE_MUSIC_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!values.APPLE_MUSIC_TEAM_ID || !values.APPLE_MUSIC_KEY_ID || !privateKey) throw new Error('必要な設定がありません');
  const iat = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: values.APPLE_MUSIC_KEY_ID })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: values.APPLE_MUSIC_TEAM_ID, iat, exp: iat + tokenLifetimeSeconds })).toString('base64url');
  const input = `${header}.${payload}`;
  const signer = createSign('SHA256');
  signer.update(input);
  signer.end();
  return `${input}.${signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

const page = `<!doctype html>
<html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Apple Music の認可</title>
<script src="/authorize.js" defer></script>
<script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js" defer></script>
<body><main><h1>Apple Music の認可</h1>
<p>認可したアカウントの最近聴いた曲をサイトで公開するためのトークンを取得します．</p>
<button id="authorize" disabled>Apple Music で認可する</button>
<p id="status" role="status">MusicKit を読み込んでいます．</p>
<label for="token">Music User Token</label><br>
<textarea id="token" rows="8" cols="60" readonly spellcheck="false" autocomplete="off"></textarea><br>
<button id="copy" disabled>コピーする</button>
<p>値は Cloudflare の APPLE_MUSIC_USER_TOKEN Secret へ登録してください．作業後はこのページを閉じ，Ctrl+C でサーバーを終了してください．</p>
</main></body></html>`;

const clientScript = `const button = document.getElementById('authorize');
const status = document.getElementById('status');
const token = document.getElementById('token');
const copy = document.getElementById('copy');
// 原因の切り分け用：認可のウィンドウが開いたか，ブロックされたかを記録する．
let popupState = 'ウィンドウは開かれていません';
const nativeOpen = window.open.bind(window);
window.open = (...args) => {
  const opened = nativeOpen(...args);
  popupState = opened ? 'ウィンドウは開きました' : 'ウィンドウがブロックされました';
  return opened;
};
let music;
document.addEventListener('musickitloaded', async () => {
  try {
    const response = await fetch('/developer-token', { method: 'POST' });
    if (!response.ok) throw new Error();
    const { developerToken } = await response.json();
    await MusicKit.configure({ developerToken, app: { name: 'portfolio-site', build: '1' } });
    music = MusicKit.getInstance();
    button.disabled = false;
    status.textContent = 'Apple Music のアカウントで認可してください．';
  } catch (error) {
    console.error('musickit-configure-error', error?.name, String(error?.message ?? '').slice(0, 200));
    status.textContent = 'MusicKit の準備に失敗しました．Team ID・Key ID・鍵を確認してください．';
  }
}, { once: true });
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    // 押した操作から直接呼ぶ（間に通信を挟むと，認可のウィンドウがブロックされることがある）．
    const userToken = await music.authorize();
    token.value = userToken;
    copy.disabled = !userToken;
    status.textContent = '取得しました．値をコピーして Secret を更新してください．';
  } catch (error) {
    // 原因の切り分け用に，エラーの種類とコードだけを表示する（トークンや鍵は含まれない）．
    const detail = [error?.name, error?.errorCode, error?.code].filter(value => typeof value === 'string' && value).join(' / ').slice(0, 120);
    console.error('musickit-error', detail, String(error?.message ?? '').slice(0, 200));
    status.textContent = '認可できませんでした．設定と Apple Music の契約を確認して，再実行してください．' + (detail ? '（' + detail + '）' : '') + ' ［' + popupState + '］ ' + String(error?.message ?? '').slice(0, 160);
  } finally {
    button.disabled = false;
  }
});
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(token.value);
    status.textContent = 'コピーしました．';
  } catch {
    token.select();
    status.textContent = 'コピーできませんでした．選択された値を手動でコピーしてください．';
  }
});`;

async function main() {
  const developerToken = await makeDeveloperToken();
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    // ローカルホストへの DNS リバインディングや別オリジンからの取得を拒否する．
    if (!allowedHosts.has(request.headers.host ?? '') || (request.headers.origin && !allowedOrigins.has(request.headers.origin))) {
      response.writeHead(403).end();
      return;
    }
    if (request.url === '/developer-token' && request.method === 'POST' && allowedOrigins.has(request.headers.origin ?? '')) {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ developerToken }));
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end();
      return;
    }
    if (request.url === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(page);
    } else if (request.url === '/authorize.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      response.end(clientScript);
    } else response.writeHead(404).end();
  });
  server.on('error', () => {
    console.error('ローカルサーバーを起動できませんでした．ポート 8787 を確認してください．');
    process.exitCode = 1;
  });
  server.listen(port, hostname, () => {
    console.info(`認可ページ: ${origin} （終了: Ctrl+C）`);
  });
  process.once('SIGINT', () => server.close());
  process.once('SIGTERM', () => server.close());
}

main().catch(() => {
  // 例外の詳細にはファイル名や鍵の情報が混じる可能性があるため表示しない．
  console.error('認可の準備に失敗しました．Team ID・Key ID・PEM 形式の秘密鍵と，引数を確認してください．');
  process.exitCode = 1;
});

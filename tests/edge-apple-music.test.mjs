import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto, randomUUID } from 'node:crypto';
import ts from 'typescript';

async function loadModule(name) {
  const source = await readFile(new URL(`../src/lib/edge/${name}.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}
const { buildDeveloperToken, normalizeRecentTracks, getRecentMusic, musicTtl } = await loadModule('appleMusic');
const { serveApi } = await loadModule('http');
// 秘密情報のフィクスチャは毎回メモリ内で生成し，値をファイルへ残さない．
const keys = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const exported = await webcrypto.subtle.exportKey('pkcs8', keys.privateKey);
const pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(exported).toString('base64')}\n-----END PRIVATE KEY-----`;
const env = {
  APPLE_MUSIC_TEAM_ID: randomUUID(), APPLE_MUSIC_KEY_ID: randomUUID(),
  APPLE_MUSIC_PRIVATE_KEY: pem, APPLE_MUSIC_USER_TOKEN: randomUUID(),
};
const now = Date.UTC(2026, 0, 1);
const track = (type = 'songs', attributes = {}) => ({
  id: 'fixture-id', type, playedAt: '非公開の再生日時',
  attributes: {
    name: 'テスト曲', artistName: 'テスト奏者', albumName: 'テストアルバム',
    artwork: { url: 'https://is1-ssl.mzstatic.com/image/{w}x{h}bb.jpg' },
    url: 'https://music.apple.com/jp/album/fixture', extra: '返さない属性', ...attributes,
  },
});
const dependencies = { now: () => now, subtle: webcrypto.subtle };
const request = (method = 'GET') => new Request('https://portfolio.example/api/music/recent', { method });
function handler(secrets, fetch, method = 'GET') {
  return serveApi(request(method), { ttl: musicTtl, load: () => getRecentMusic(secrets, { ...dependencies, fetch }) });
}

test('Developer Token の ES256 署名を公開鍵で検証し，時刻とヘッダーを確認する', async () => {
  for (const privateKeyPem of [pem, pem.replace(/\n/g, '\\n')]) {
    const token = await buildDeveloperToken({ teamId: env.APPLE_MUSIC_TEAM_ID, keyId: env.APPLE_MUSIC_KEY_ID, privateKeyPem, now, subtle: webcrypto.subtle });
    const [header, payload, signature] = token.split('.');
    assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'ES256', kid: env.APPLE_MUSIC_KEY_ID });
    const claims = JSON.parse(Buffer.from(payload, 'base64url'));
    assert.equal(claims.iss, env.APPLE_MUSIC_TEAM_ID);
    assert.equal(claims.iat, now / 1000);
    assert.ok(claims.exp > claims.iat && claims.exp - claims.iat <= 12 * 60 * 60);
    assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'iss']);
    assert.equal(Buffer.from(signature, 'base64url').length, 64);
    assert.ok(await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keys.publicKey, Buffer.from(signature, 'base64url'), Buffer.from(`${header}.${payload}`)));
  }
});

test('songs / library-songs を整形し，余計な属性を返さない', () => {
  const tracks = normalizeRecentTracks({ data: [track(), track('library-songs')] });
  assert.equal(tracks.length, 2);
  assert.deepEqual(tracks[0], {
    title: 'テスト曲', artist: 'テスト奏者', album: 'テストアルバム',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/120x120bb.jpg', url: 'https://music.apple.com/jp/album/fixture',
  });
  assert.deepEqual(tracks[1], tracks[0]);
  assert.deepEqual(Object.keys(tracks[0]).sort(), ['album', 'artist', 'artworkUrl', 'title', 'url']);
  assert.doesNotMatch(JSON.stringify(tracks), /fixture-id|playedAt|非公開|extra|返さない属性/);
});

test('必須項目がない行・曲以外を除外し，想定外の構造は空配列へ倒す', () => {
  assert.equal(normalizeRecentTracks({ data: [null, {}, track('albums'), track('songs', { name: '' }), track('songs', { artistName: ' ' }), track('songs', { name: 42 }), track('songs', { albumName: null })] }).length, 1);
  for (const response of [null, [], {}, { data: {} }, { data: null }, { data: [{ type: 'songs', attributes: [] }] }]) {
    assert.deepEqual(normalizeRecentTracks(response), []);
  }
  assert.equal(normalizeRecentTracks({ data: Array.from({ length: 8 }, () => track()) }, 8).length, 5);
  assert.equal(normalizeRecentTracks({ data: [track(), track()] }, 1).length, 1);
  assert.deepEqual(normalizeRecentTracks({ data: [track()] }, 0), []);
});

test('ジャケットとリンクの URL は許可された HTTPS ホストだけを残す', () => {
  for (const url of ['https://example.com/a.jpg', 'http://is1.mzstatic.com/a.jpg', 'https://evil-mzstatic.com/a.jpg', 'https://is1.mzstatic.com.evil.example/a.jpg', 'https://user@is1.mzstatic.com/a.jpg', 'javascript:alert(1)', 'https://is1.mzstatic.com:444/a.jpg']) {
    const [result] = normalizeRecentTracks({ data: [track('songs', { artwork: { url } })] });
    assert.equal(result.artworkUrl, '');
  }
  for (const url of ['https://example.com/', 'https://music.apple.com.evil.example/', 'http://music.apple.com/', 'https://music.apple.com@evil.example/', 'javascript:alert(1)', '//music.apple.com/', 'https://music.apple.com/\\\\evil.example/']) {
    const [result] = normalizeRecentTracks({ data: [track('songs', { url })] });
    assert.equal(result.url, undefined);
    assert.equal(Object.hasOwn(result, 'url'), false);
  }
});

test('Secret が未設定なら通信せず no_token を返す', async () => {
  for (const key of Object.keys(env)) {
    const response = await handler({ ...env, [key]: '' }, () => { throw new Error('通信してはいけません'); });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { tracks: [], apiStatus: 'no_token' });
  }
});

test('Apple の 401 / 403 / 429 / その他の失敗と通信例外を状態に変換する', async () => {
  for (const [status, expected] of [[401, 'token_expired'], [403, 'token_expired'], [429, 'rate_limited'], [500, 'offline']]) {
    const response = await handler(env, async () => new Response(null, { status }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { tracks: [], apiStatus: expected });
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  const response = await handler(env, async () => { throw new Error(Object.values(env).join(' ')); });
  const body = await response.text();
  assert.deepEqual(JSON.parse(body), { tracks: [], apiStatus: 'offline' });
  for (const value of Object.values(env)) assert.equal(body.includes(value), false);
});

test('成功時は所定の endpoint と認証を使い，出力へトークンや鍵を含めない', async () => {
  let developerToken;
  const response = await handler(env, async (url, init) => {
    assert.equal(url, 'https://api.music.apple.com/v1/me/recent/played/tracks?limit=5');
    assert.equal(init.headers['Music-User-Token'], env.APPLE_MUSIC_USER_TOKEN);
    assert.ok(init.signal);
    developerToken = init.headers.Authorization.slice('Bearer '.length);
    return Response.json({ data: [track()] });
  });
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(body).apiStatus, 'success');
  assert.equal(JSON.parse(body).tracks.length, 1);
  assert.match(response.headers.get('cache-control'), /public, max-age=120, s-maxage=120/);
  for (const value of [...Object.values(env), developerToken]) assert.equal(body.includes(value), false);
});

test('Developer Token は再利用し，期限直前と鍵の変更で署名し直す', async () => {
  let signs = 0;
  const subtle = new Proxy(webcrypto.subtle, { get(target, key) {
    if (key === 'sign') return (...args) => { signs += 1; return target.sign(...args); };
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  const fetch = async () => Response.json({ data: [] });
  await getRecentMusic(env, { ...dependencies, subtle, fetch });
  await getRecentMusic(env, { ...dependencies, subtle, fetch });
  assert.equal(signs, 1);
  await getRecentMusic(env, { now: () => now + 12 * 60 * 60 * 1000 - 60 * 1000, subtle, fetch });
  assert.equal(signs, 2);
  await getRecentMusic({ ...env, APPLE_MUSIC_KEY_ID: randomUUID() }, { ...dependencies, subtle, fetch });
  assert.equal(signs, 3);
});

test('GET 以外は認証や取得をせず 405 を返す', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
    const response = await handler(env, () => { throw new Error('呼び出してはいけません'); }, method);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET');
  }
});

async function musicClient(fetchWithTimeout, store = new Map()) {
  const source = await readFile(new URL('../src/services/musicService.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const module = { exports: {} };
  const require = (name) => name.includes('appleMusic') ? { normalizeRecentTracks } : { fetchWithTimeout };
  new Function('require', 'module', 'exports', 'localStorage', compiled)(require, module, module.exports, localStorage);
  return module.exports;
}

test('音楽クライアントはタイムアウトを指定し，5 分以内のキャッシュだけ使う', async () => {
  const tracks = normalizeRecentTracks({ data: [track()] });
  for (const [minutes, expectedCalls] of [[4, 0], [6, 1]]) {
    let calls = 0;
    const store = new Map([['apple_music_recent_v1', JSON.stringify({ timestamp: Date.now() - minutes * 60 * 1000, tracks })]]);
    const client = await musicClient(async (url, _init, timeoutMs) => {
      calls += 1;
      assert.equal(url, '/api/music/recent');
      assert.equal(timeoutMs, 8000);
      return Response.json({ tracks, apiStatus: 'success' });
    }, store);
    assert.deepEqual((await client.fetchRecentMusic()).tracks, tracks);
    await client.fetchRecentMusic();
    assert.equal(calls, expectedCalls);
  }
});

test('音楽クライアントは失敗・404・タイムアウトで空配列を返し，キャッシュ内 URL も検証する', async () => {
  for (const apiStatus of ['offline', 'no_token', 'token_expired', 'rate_limited', '404', 'timeout']) {
    const client = await musicClient(async () => {
      if (apiStatus === 'timeout') throw new Error();
      if (apiStatus === '404') return new Response(null, { status: 404 });
      return Response.json({ tracks: [{ title: '表示しないテスト曲' }], apiStatus });
    });
    const data = await client.fetchRecentMusic();
    assert.deepEqual(data.tracks, []);
    assert.equal(data.apiStatus, ['404', 'timeout'].includes(apiStatus) ? 'offline' : apiStatus);
  }
  const client = await musicClient(() => { throw new Error(); }, new Map([['apple_music_recent_v1', JSON.stringify({
    timestamp: Date.now(), tracks: [{ title: 'テスト曲', artist: 'テスト奏者', artworkUrl: 'https://evil.example/image', url: 'javascript:alert(1)' }],
  })]]));
  const [result] = (await client.fetchRecentMusic()).tracks;
  assert.equal(result.artworkUrl, '');
  assert.equal(result.url, undefined);
});

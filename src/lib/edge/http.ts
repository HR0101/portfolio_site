// Fetch API だけを使い，Pages と Next の応答・キャッシュ契約をそろえる．
export type ApiStatus = 'success' | 'offline' | 'rate_limited' | 'no_token' | 'token_expired';

export interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

// 成功以外の応答は短くだけ保存する（一時的な失敗が長く居座らないように）．
const failureTtlSeconds = 30;

interface ApiOptions {
  ttl: number;
  load: () => Promise<{ apiStatus: ApiStatus }>;
  cache?: EdgeCache;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export async function serveApi(request: Request, options: ApiOptions): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  }
  // 現在の API はクエリを受け付けないため，すべて除いて同じキーへまとめる．
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '');
  const key = new Request(url, { method: 'GET' });
  try {
    const cached = await options.cache?.match(key);
    if (cached) return cached;
  } catch {
    // キャッシュが使えなくても上流の取得を続ける．
  }
  const data = await options.load();
  const ttl = data.apiStatus === 'success' ? options.ttl : Math.min(options.ttl, failureTtlSeconds);
  const response = Response.json(data, {
    status: 200,
    headers: {
      'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
      'x-api-status': data.apiStatus,
      'X-Content-Type-Options': 'nosniff',
    },
  });
  if (options.cache) {
    const cache = options.cache;
    const copy = response.clone();
    const put = Promise.resolve().then(() => cache.put(key, copy)).catch(() => {
      // 保存失敗をレスポンスやログに露出しない．
    });
    if (options.waitUntil) options.waitUntil(put);
    else await put;
  }
  return response;
}

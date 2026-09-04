// 応答が返らないリクエストで処理が止まらないよう，時間制限付きで fetch する．
// サーバー側（GitHub API 呼び出し）とクライアント側（自サイトの API 呼び出し）の両方で使う．

// 既定の待ち時間（ミリ秒）
const DEFAULT_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    // 成功・失敗どちらでもタイマーを解放する
    clearTimeout(timeoutId);
  }
}

// Pages Functions で利用する部分だけをローカルに宣言する．
interface Env {
  GITHUB_TOKEN?: string;
  APPLE_MUSIC_TEAM_ID?: string;
  APPLE_MUSIC_KEY_ID?: string;
  APPLE_MUSIC_PRIVATE_KEY?: string;
  APPLE_MUSIC_USER_TOKEN?: string;
}
interface EventContext<E = Env> {
  request: Request;
  env: E;
  waitUntil(promise: Promise<unknown>): void;
}
type PagesFunction<E = Env> = (context: EventContext<E>) => Response | Promise<Response>;
interface CacheStorage {
  readonly default: import('../src/lib/edge/http').EdgeCache;
}

import { isOpaqueColor, isTransparentColor, PRODUCT_MORPH_DURATION_MS, PRODUCT_MORPH_EASING } from '../lib/transitionEffects';

// A temporary name pairs the clicked screen with the new hero screen (the only shared element:
// the title and the card behind it retreat and arrive with the rest of the page).
// Going back runs the same pairing in reverse: the hero screen shrinks into its tile in the Apps wall.
// The name is removed at the end so theme transitions still include every element.
interface SharedPart {
  source: HTMLElement;
  target?: HTMLElement;
  sourceName: string;
  targetName?: string;
  name: string;
  // 移動先のページから，対になる要素を探す
  find: (main: HTMLElement) => HTMLElement | null;
  radius: string;
}

// parts：名前を付けた共有要素．backdrop：古いページが薄れたあと，新しいページが現れるまでに見える面の色．
// returning：紹介ページから一覧へ戻る向き（着地先の壁が組まれるのを待つ）
export interface ProductTransition { parts: SharedPart[]; backdrop: string | null; returning: boolean }

// 退いたページの下に見える面の色を，<html> に書くカスタムプロパティの名前（motion.css が読む）
export const BACKDROP_PROPERTY = '--route-backdrop';
// 画面の左端（縦の中央）を見る．カードや固定の部品が少なく，ページ本来の面がいちばん出やすい
const BACKDROP_PROBE_X = 2;

// 押した位置のページが，画面の端でどんな面の色をしているか（黒いヒーロー，白いページ，ダークの面など）
function readPageBackdrop(): string | null {
  for (const element of document.elementsFromPoint(BACKDROP_PROBE_X, window.innerHeight / 2)) {
    const color = getComputedStyle(element).backgroundColor;
    if (isOpaqueColor(color)) return color;
  }
  return null;
}

// 枠も背景も影も持たない透明な入れ物（Apps のパネルの画面）は，中の画像そのものを共有元にする．
// 入れ物の余白まで撮ると，縦横比の違う画面へ育つときに画像が大きく切り取られ，大きさの違う 2 枚が二重に重なって見える．
// 画像そのものなら，着地先の画面と縦横比がそろい，交差フェードしても同じ画面が育っているように見える
function resolveSharedSource(container: HTMLElement): HTMLElement {
  if (container instanceof HTMLImageElement) return container;
  const style = getComputedStyle(container);
  const bare = style.overflow === 'visible' && style.backgroundImage === 'none' && style.boxShadow === 'none'
    && parseFloat(style.borderTopWidth) === 0 && isTransparentColor(style.backgroundColor);
  const images = container.querySelectorAll<HTMLImageElement>('img');
  return bare && images.length === 1 && visible(images[0]) ? images[0] : container;
}

function visible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
}

function readRadius(element: HTMLElement): string {
  return getComputedStyle(element).borderRadius;
}

export function captureProductTransition(anchor: HTMLAnchorElement): ProductTransition | null {
  const scope = anchor.closest<HTMLElement>('[data-morph-scope]');
  const container = scope?.querySelector<HTMLElement>('[data-morph-source]') ?? anchor.querySelector<HTMLElement>('[data-morph-source], img');
  if (!container || !visible(container)) return null;
  const image = resolveSharedSource(container);
  const icon = container instanceof HTMLImageElement && !container.src.includes('-screens/');
  const parts: SharedPart[] = [];
  const add = (source: HTMLElement | null | undefined, name: string, selector: string) => {
    if (!source || !visible(source) || parts.some(part => part.source === source)) return;
    parts.push({ source, sourceName: source.style.viewTransitionName, name, find: main => main.querySelector<HTMLElement>(selector), radius: readRadius(source) });
    source.style.viewTransitionName = name;
  };
  add(image, 'product-morph', icon ? '[data-morph-icon]' : '[data-morph-target]');
  return { parts, backdrop: readPageBackdrop(), returning: false };
}

// ───────── 戻る向き：紹介ページの主役の画面が，アプリの壁の元のタイルへ縮んで戻る ─────────
const PRODUCT_PAGE_PATTERN = /^\/apps\/([^/]+)\/?$/;
// 戻り先の壁へ着くハッシュ（紹介ページの「← アプリ一覧」の行き先）
const WALL_RETURN_HASH = '#projects';
// 壁が固定表示になる条件（Projects.tsx の PIN_QUERY と同じ．そろわないと着地点が決まらない）
const WALL_PIN_QUERY = '(min-width: 1000px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';
// 壁は，ページが載ったあとの効果（固定表示の設定）で組まれる．それまで待つ上限と間隔
const WALL_SETTLE_TIMEOUT_MS = 240;
const WALL_SETTLE_STEP_MS = 16;

// 固定表示の壁にある，そのアプリのタイル．開いている（大きなパネルに育っている）ときはパネルの実画面，閉じた小さなタイルは，タイルそのもの
function findWallTile(main: HTMLElement, slug: string): HTMLElement | null {
  const tile = main.querySelector<HTMLElement>(`[data-app-tile] a[href^="/apps/${CSS.escape(slug)}"]`)?.closest<HTMLElement>('[data-app-tile]');
  if (!tile?.closest('[data-app-track]')?.hasAttribute('data-pin')) return null;
  if (tile.dataset.open !== 'true') return tile;
  const screen = tile.querySelector<HTMLElement>('[data-morph-source]');
  return screen ? resolveSharedSource(screen) : tile;
}

export function captureReturnTransition(destination: URL): ProductTransition | null {
  const slug = PRODUCT_PAGE_PATTERN.exec(window.location.pathname)?.[1];
  if (!slug || destination.pathname !== '/' || destination.hash !== WALL_RETURN_HASH || !window.matchMedia(WALL_PIN_QUERY).matches) return null;
  const hero = document.querySelector<HTMLElement>('#main-content [data-morph-target]');
  if (!hero || !visible(hero)) return null;
  const part: SharedPart = { source: hero, sourceName: hero.style.viewTransitionName, name: 'product-morph', find: main => findWallTile(main, slug), radius: readRadius(hero) };
  hero.style.viewTransitionName = part.name;
  return { parts: [part], backdrop: readPageBackdrop(), returning: true };
}

// 着地先のタイルが現れるまで待つ（古いページの絵が止まって見える．待つのは数フレーム分まで）．
// 描画が止まっている間は rAF が進まないので，タイマーで見る
export async function settleReturnTransition(state: ProductTransition, main: HTMLElement): Promise<void> {
  if (!state.returning) return;
  const deadline = performance.now() + WALL_SETTLE_TIMEOUT_MS;
  while (!state.parts.every(part => part.find(main)) && performance.now() < deadline) {
    await new Promise<void>(resolve => window.setTimeout(resolve, WALL_SETTLE_STEP_MS));
  }
}

export function attachProductTransition(state: ProductTransition, main: HTMLElement): void {
  state.parts.forEach(part => { part.source.style.viewTransitionName = part.sourceName; });
  state.parts.forEach(part => {
    const target = part.find(main);
    if (!target || !visible(target)) return;
    part.target = target;
    part.targetName = target.style.viewTransitionName;
    target.style.viewTransitionName = part.name;
  });
}

// 角丸は，位置と大きさ（UA が group に付ける動き）と同じ時間・同じ曲線で，押した画面の角丸から着地先の角丸へ移す．
// 戻る向きの着地先（壁のタイル）は，この時点ではまだ配置されておらず（Projects が次のフレームで組む）角丸が読めない．
// そのあいだは元の角丸を保つ（タイルも紹介ページの画面も，同じ程度の丸さ）
export function animateProductTransition(state: ProductTransition): Animation[] {
  return state.parts.flatMap(part => part.target ? [document.documentElement.animate([
    { borderRadius: part.radius },
    { borderRadius: state.returning && parseFloat(readRadius(part.target)) === 0 ? part.radius : readRadius(part.target) },
  ], { duration: PRODUCT_MORPH_DURATION_MS, easing: PRODUCT_MORPH_EASING, fill: 'both', pseudoElement: `::view-transition-group(${part.name})` })] : []);
}

export function clearProductTransition(state: ProductTransition | null): void {
  state?.parts.forEach(part => {
    part.source.style.viewTransitionName = part.sourceName;
    if (part.target) part.target.style.viewTransitionName = part.targetName ?? '';
  });
}

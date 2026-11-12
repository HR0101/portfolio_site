export const TRANSITION_EFFECTS = ['fade', 'slide', 'scale', 'wipe', 'shared', 'morph'] as const;
export type TransitionEffect = typeof TRANSITION_EFFECTS[number];
export const TRANSITION_EASING = 'cubic-bezier(.22, 1, .36, 1)';

// 紹介ページへ移るとき（'shared'）の動き．
// 主役（押した画面）が育って着くまでの時間と曲線は，motion.css の --morph-duration と
// design-tokens.css の --ease-in-out と同じ値にそろえる（WAAPI の easing は var() を読めないため 2 か所に置く）
export const PRODUCT_MORPH_DURATION_MS = 480;
export const PRODUCT_MORPH_EASING = 'cubic-bezier(0.77, 0, 0.175, 1)';
// 周りの退き方：古いページは変形の前半で短く薄れて少し縮み，新しいページは主役が着くころに下から現れる
const SHARED_EXIT_DURATION_MS = 200;
const SHARED_EXIT_SCALE = 0.98;
const SHARED_ENTER_DELAY_MS = 240;
const SHARED_ENTER_DURATION_MS = 360;
const SHARED_ENTER_OFFSET = '2%';
// 登場・退場の曲線（design-tokens.css の --ease-out と同じ値）
const SETTLE_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)';

// 古い／新しいページの層（::view-transition-old/new(root)）の時間配分
export interface ViewportTiming { duration: number; delay: number; easing: string }

export function viewportTiming(effect: TransitionEffect, entering: boolean): ViewportTiming {
  if (effect === 'shared') {
    return entering
      ? { duration: SHARED_ENTER_DURATION_MS, delay: SHARED_ENTER_DELAY_MS, easing: SETTLE_EASING }
      : { duration: SHARED_EXIT_DURATION_MS, delay: 0, easing: SETTLE_EASING };
  }
  return {
    duration: entering ? (effect === 'fade' ? 900 : 1050) : 540,
    delay: entering ? (effect === 'wipe' ? 150 : 90) : 0,
    easing: TRANSITION_EASING,
  };
}

// 古いページが薄れたあとに見える面の色（押した位置の背景色）を選ぶための判定．どちらも computed style の文字列を見る．
// 不透明な背景色か．rgb(...) は不透明，rgba(...) と「/ 値」の形はアルファが 1 のものだけ
export function isOpaqueColor(color: string): boolean {
  if (!color || color === 'transparent') return false;
  if (!color.startsWith('rgba(') && !color.includes('/')) return true;
  const alpha = /(?:,|\/)\s*([\d.]+)(%?)\s*\)$/.exec(color);
  if (!alpha) return true;
  return parseFloat(alpha[1]) / (alpha[2] ? 100 : 1) >= 0.99;
}

// 完全に透明な背景色か（背景を持たない入れ物の判定に使う）
export function isTransparentColor(color: string): boolean {
  return color === 'transparent' || /^rgba\(.*,\s*0\)$/.test(color);
}

export function isTransitionEffect(value: unknown): value is TransitionEffect {
  return TRANSITION_EFFECTS.some(effect => effect === value);
}

export function viewportFrames(effect: TransitionEffect, entering: boolean, direction = 1): Keyframe[] {
  const resting: Keyframe = { opacity: 1, transform: 'none', clipPath: 'inset(0% 0% 0% 0% round 0px)' };
  if (effect === 'fade') return entering ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
  if (effect === 'slide') return entering
    ? [{ opacity: 1, transform: `translateX(${direction * 100}%)` }, resting]
    : [resting, { opacity: 0, transform: `translateX(${-direction * 24}%)` }];
  if (effect === 'scale') return entering
    ? [{ opacity: 0, transform: 'scale(.82)' }, resting]
    : [resting, { opacity: 0, transform: 'scale(1.09)' }];
  if (effect === 'wipe') {
    const clipped = direction > 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)';
    const swept = direction > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)';
    return entering ? [{ clipPath: clipped }, resting] : [resting, { clipPath: swept }];
  }
  // 主役の画面は別の層（product-morph）で動くので，ここは「残りの面」だけ．
  // 古い側は短く薄れて少し縮み，新しい側は下から現れる
  if (effect === 'shared') return entering
    ? [{ opacity: 0, transform: `translateY(${SHARED_ENTER_OFFSET})` }, { opacity: 1, transform: 'none' }]
    : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `scale(${SHARED_EXIT_SCALE})` }];
  if (effect === 'morph') return entering
    ? [{ opacity: .4, transform: 'scale(.92)', clipPath: 'inset(14% 20% 14% 20% round 96px)' },
      { opacity: 1, transform: 'scale(.99)', clipPath: 'inset(2% 3% 2% 3% round 32px)', offset: .65 }, resting]
    : [resting, { opacity: 0, transform: 'scale(.96)', clipPath: 'inset(8% 12% 8% 12% round 64px)' }];
  return entering ? [{ opacity: 0, transform: 'scale(.975)' }, resting] : [resting, { opacity: 0, transform: 'scale(.985)' }];
}

export function animateViewportTransition(effect: TransitionEffect, direction = 1): Animation[] {
  const root = document.documentElement;
  return [false, true].map(entering => root.animate(viewportFrames(effect, entering, direction), {
    ...viewportTiming(effect, entering),
    fill: 'both',
    pseudoElement: entering ? '::view-transition-new(root)' : '::view-transition-old(root)',
  }));
}

export const SECTION_EFFECTS: Record<string, TransitionEffect> = {
  about: 'fade', skills: 'scale', projects: 'slide', works: 'wipe', github: 'fade', contact: 'morph', hero: 'scale',
};

export const ROUTE_NAVIGATION_EVENT = 'portfolio:route-navigation';
export interface RouteNavigationRequest { href: string; effect?: TransitionEffect }

export function navigateToPage(href: string, effect?: TransitionEffect): void {
  const event = new CustomEvent<RouteNavigationRequest>(ROUTE_NAVIGATION_EVENT, { cancelable: true, detail: { href, effect } });
  if (window.dispatchEvent(event)) window.location.assign(href);
}

// Native viewport snapshots can retarget a click to <html>. The fixed header
// keeps the same coordinates, so replay its intended control after cancellation
// has removed the snapshot tree. Moving content is deliberately not replayed.
export function replayHeaderClick(event: MouseEvent, transition?: ViewTransition): void {
  const header = document.querySelector<HTMLElement>('.site-navbar');
  if (!header || event.target !== document.documentElement) return;
  const rect = header.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
  void Promise.resolve(transition?.finished).catch(() => {}).then(() => {
    window.requestAnimationFrame(() => {
      if (document.documentElement.matches('.is-route-switching, .is-section-switching, .is-theme-switching')) return;
      const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('button, a[href]');
      if (element && header.contains(element) && !element.matches(':disabled')) element.click();
    });
  });
}

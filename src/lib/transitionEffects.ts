export const TRANSITION_EFFECTS = ['fade', 'slide', 'scale', 'wipe', 'shared', 'morph'] as const;
export type TransitionEffect = typeof TRANSITION_EFFECTS[number];
export const TRANSITION_EASING = 'cubic-bezier(.22, 1, .36, 1)';

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
  if (effect === 'morph') return entering
    ? [{ opacity: .4, transform: 'scale(.92)', clipPath: 'inset(14% 20% 14% 20% round 96px)' },
      { opacity: 1, transform: 'scale(.99)', clipPath: 'inset(2% 3% 2% 3% round 32px)', offset: .65 }, resting]
    : [resting, { opacity: 0, transform: 'scale(.96)', clipPath: 'inset(8% 12% 8% 12% round 64px)' }];
  return entering ? [{ opacity: 0, transform: 'scale(.975)' }, resting] : [resting, { opacity: 0, transform: 'scale(.985)' }];
}

export function animateViewportTransition(effect: TransitionEffect, direction = 1): Animation[] {
  const root = document.documentElement;
  return [false, true].map(entering => root.animate(viewportFrames(effect, entering, direction), {
    duration: entering ? (effect === 'fade' ? 900 : 1050) : 540,
    delay: entering ? (effect === 'wipe' ? 150 : 90) : 0,
    easing: TRANSITION_EASING,
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

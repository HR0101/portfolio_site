'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { animateViewportTransition, isTransitionEffect, replayHeaderClick, ROUTE_NAVIGATION_EVENT, TRANSITION_EASING, viewportFrames, type RouteNavigationRequest, type TransitionEffect } from '../lib/transitionEffects';
import { animateProductTransition, attachProductTransition, captureProductTransition, clearProductTransition, type ProductTransition } from './ProductMorph';

interface NavigationRun {
  url: URL;
  effect: TransitionEffect;
  direction: number;
  shared: ProductTransition | null;
  native?: ViewTransition;
  animations: Set<Animation>;
  resolve?: () => void;
  timer: number;
  committed: boolean;
  preparing: boolean;
}

function settleContent(main: HTMLElement): void {
  main.getAnimations({ subtree: true }).forEach(animation => {
    if (animation.timeline !== document.timeline || animation.effect?.getTiming().iterations === Infinity) return;
    try { animation.finish(); } catch { /* The effect may already be canceled. */ }
  });
}

function samePath(first: string, second: string): boolean {
  return (first.replace(/\/+$/, '') || '/') === (second.replace(/\/+$/, '') || '/');
}

export function NavigationTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const active = useRef<NavigationRun | null>(null);
  const pendingDestination = useRef<URL | null>(null);

  useLayoutEffect(() => {
    const run = active.current;
    const main = document.getElementById('main-content');
    if (!main) return;
    // Even if a slow response outlives the visual transition, land at the
    // requested content when the router eventually commits it.
    if (!run) {
      const destination = pendingDestination.current;
      if (!destination || !samePath(pathname, destination.pathname)) return;
      pendingDestination.current = null;
      let target: HTMLElement | null = null;
      try { target = destination.hash ? document.getElementById(decodeURIComponent(destination.hash.slice(1))) : null; } catch { /* Use the page start for malformed fragments. */ }
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }
    if (!samePath(pathname, run.url.pathname) || !run.resolve || run.preparing) return;
    pendingDestination.current = null;
    run.preparing = true;
    run.committed = true;
    const prepare = async () => {
      let target: HTMLElement | null = null;
      try { target = run.url.hash ? document.getElementById(decodeURIComponent(run.url.hash.slice(1))) : null; } catch { /* An invalid fragment still opens the page. */ }
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const heading = target?.querySelector<HTMLElement>('h1, h2') ?? main.querySelector<HTMLElement>('h1');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) {
          heading.tabIndex = -1;
          heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
        }
        heading.focus({ preventScroll: true });
      }
      if (run.shared) attachProductTransition(run.shared, main);
      // Decoding works while native rendering is paused; awaiting a frame does not.
      const images = Array.from(main.querySelectorAll<HTMLImageElement>('header img')).slice(0, 5);
      await Promise.race([
        Promise.all(images.map(image => image.decode?.().catch(() => {}))),
        new Promise<void>(resolve => window.setTimeout(resolve, 500)),
      ]);
      if (active.current !== run) return;
      settleContent(main);
      window.clearTimeout(run.timer);
      const resolve = run.resolve;
      run.resolve = undefined;
      resolve?.();
    };
    void prepare();
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const main = document.getElementById('main-content');
    if (!main) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finish = (run: NavigationRun) => {
      if (active.current !== run) return;
      window.clearTimeout(run.timer);
      run.resolve?.();
      run.resolve = undefined;
      if (run.committed) settleContent(main);
      clearProductTransition(run.shared);
      run.animations.forEach(animation => animation.cancel());
      active.current = null;
      root.classList.remove('is-route-switching');
      delete root.dataset.routeEffect;
      delete root.dataset.routeDestination;
    };
    const cancel = () => {
      const run = active.current;
      if (!run) return;
      run.native?.skipTransition();
      finish(run);
    };
    const move = (run: NavigationRun) => new Promise<void>(resolve => {
      run.resolve = resolve;
      pendingDestination.current = run.url;
      // Slow responses must not leave the viewport frozen indefinitely.
      run.timer = window.setTimeout(() => { run.native?.skipTransition(); finish(run); }, 2800);
      router.push(`${run.url.pathname}${run.url.search}${run.url.hash}`, { scroll: false });
    });
    const fallback = async (run: NavigationRun) => {
      try {
        if (!media.matches) {
          const outgoing = main.animate(viewportFrames('fade', false), { duration: 220, fill: 'forwards' });
          run.animations.add(outgoing);
          await outgoing.finished;
        }
        if (active.current !== run) return;
        await move(run);
        if (active.current !== run) return;
        run.animations.forEach(animation => animation.cancel());
        run.animations.clear();
        if (!media.matches) {
          const effect = run.effect === 'wipe' || run.effect === 'morph' ? 'scale' : run.effect;
          const incoming = main.animate(viewportFrames(effect, true, run.direction), { duration: 850, easing: TRANSITION_EASING });
          run.animations.add(incoming);
          await incoming.finished;
        }
      } catch { /* Input or another destination can interrupt an animation. */ }
      finally { finish(run); }
    };
    const navigate = (url: URL, explicit?: TransitionEffect, anchor?: HTMLAnchorElement) => {
      cancel();
      const canAnimate = !media.matches && !root.classList.contains('is-theme-switching');
      const shared = canAnimate && !explicit && anchor && !anchor.closest('.site-navbar') && url.pathname.startsWith('/apps/') ? captureProductTransition(anchor) : null;
      const effect = explicit ?? (shared ? 'shared' : url.pathname === '/' ? 'scale' : /\/(privacy|terms)\/?$/.test(url.pathname) ? 'fade' : anchor?.closest('.site-navbar') ? 'wipe' : 'morph');
      const run: NavigationRun = { url, effect, shared, direction: url.pathname === '/' ? -1 : 1, animations: new Set(), timer: 0, committed: false, preparing: false };
      active.current = run;
      if (canAnimate) {
        root.classList.add('is-route-switching');
        root.dataset.routeEffect = effect;
        root.dataset.routeDestination = url.pathname;
      }
      if (!canAnimate || typeof document.startViewTransition !== 'function') {
        clearProductTransition(shared);
        run.shared = null;
        void fallback(run);
        return;
      }
      try {
        run.native = document.startViewTransition(() => active.current === run ? move(run) : undefined);
        void run.native.ready.then(() => {
          if (active.current !== run || media.matches) return;
          animateViewportTransition(effect, run.direction).forEach(animation => run.animations.add(animation));
          if (shared) animateProductTransition(shared).forEach(animation => run.animations.add(animation));
        }).catch(() => {});
        void run.native.finished.then(() => finish(run), () => finish(run));
      } catch { void fallback(run); }
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Cancel on click, not pointerdown: removing snapshot layers between
      // pointerdown and pointerup can otherwise swallow the intended click.
      if (active.current?.committed) {
        replayHeaderClick(event, active.current.native);
        cancel();
      }
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname !== '/' && !url.pathname.startsWith('/apps/'))) return;
      if (samePath(url.pathname, window.location.pathname)) { cancel(); return; }
      event.preventDefault();
      const effect = anchor.dataset.routeTransition;
      navigate(url, isTransitionEffect(effect) ? effect : undefined, anchor);
    };
    const onRequest = (event: Event) => {
      const request = (event as CustomEvent<RouteNavigationRequest>).detail;
      const url = new URL(request.href, window.location.href);
      if (url.origin !== window.location.origin || samePath(url.pathname, window.location.pathname)) return;
      event.preventDefault();
      navigate(url, request.effect);
    };
    const onMotionChange = () => {
      if (!media.matches) return;
      const run = active.current;
      if (!run) return;
      run.native?.skipTransition();
      run.animations.forEach(animation => animation.cancel());
    };
    const onInput = () => { if (active.current?.committed) cancel(); };
    document.addEventListener('click', onClick, true);
    window.addEventListener(ROUTE_NAVIGATION_EVENT, onRequest);
    window.addEventListener('popstate', cancel);
    window.addEventListener('wheel', onInput, { passive: true });
    window.addEventListener('touchmove', onInput, { passive: true });
    media.addEventListener('change', onMotionChange);
    return () => {
      cancel();
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(ROUTE_NAVIGATION_EVENT, onRequest);
      window.removeEventListener('popstate', cancel);
      window.removeEventListener('wheel', onInput);
      window.removeEventListener('touchmove', onInput);
      media.removeEventListener('change', onMotionChange);
    };
  }, [router]);

  return null;
}

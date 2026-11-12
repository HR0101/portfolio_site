'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SECTION_NAVIGATION_EVENT, type SectionNavigationRequest } from '../lib/sectionNavigation';
import { CARD_ENTRANCE_DURATION_MS, CARD_ENTRANCE_EASING, cardEntranceFrames, type CardDirection } from '../lib/cardMotion';
import { animateViewportTransition, replayHeaderClick, SECTION_EFFECTS, TRANSITION_EASING, viewportFrames } from '../lib/transitionEffects';

interface LandingCard {
  element: HTMLElement;
  name: string;
  previousName: string;
  direction: CardDirection;
}

interface Navigation {
  target: HTMLElement;
  committed: boolean;
  frame: number;
  timer: number;
  transition?: ViewTransition;
  animations: Set<Animation>;
  cards: LandingCard[];
}

// Section navigation is a viewport transition, separate from the smaller
// element reveals. Regular scrolling remains entirely controlled by the user.
export function SectionTransitions() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const main = document.getElementById('main-content');
    if (!main) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active: Navigation | null = null;

    const finish = (run: Navigation) => {
      if (active !== run) return;
      // Observers can run behind the viewport snapshots. Finish their one-shot
      // reveals before returning to the live destination so text stays visible.
      run.target.getAnimations({ subtree: true }).forEach(animation => {
        if (animation.timeline !== document.timeline || animation.effect?.getTiming().iterations === Infinity) return;
        try { animation.finish(); } catch { /* A canceled effect needs no finishing. */ }
      });
      run.cards.forEach(({ element, previousName }) => { element.style.viewTransitionName = previousName; });
      run.animations.forEach(animation => animation.cancel());
      run.animations.clear();
      active = null;
      root.classList.remove('is-section-switching');
      delete run.target.dataset.sectionLanding;
      delete root.dataset.sectionDirection;
      delete root.dataset.sectionDestination;
      delete root.dataset.sectionEffect;
    };

    const cancel = () => {
      if (!active) return;
      const run = active;
      window.cancelAnimationFrame(run.frame);
      window.clearTimeout(run.timer);
      run.transition?.skipTransition();
      run.animations.forEach(animation => animation.cancel());
      finish(run);
    };

    const commit = (run: Navigation) => {
      if (run.committed || !run.target.isConnected) return;
      run.committed = true;
      const hash = `#${encodeURIComponent(run.target.id)}`;
      if (window.location.hash !== hash) {
        window.history.pushState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
      }
      run.target.scrollIntoView({ behavior: 'instant', block: 'start' });
      const heading = run.target.querySelector<HTMLElement>('h1, h2, h3') ?? run.target;
      if (!heading.hasAttribute('tabindex')) {
        heading.tabIndex = -1;
        heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
      }
      heading.focus({ preventScroll: true });
      if (!media.matches && root.classList.contains('is-section-switching')) {
        run.cards = Array.from(run.target.querySelectorAll<HTMLElement>('[data-card-reveal]'))
          .filter(element => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.bottom > 64 && rect.top < window.innerHeight;
          })
          .map((element, index) => ({
            element,
            name: `section-card-${index}`,
            previousName: element.style.viewTransitionName,
            direction: element.dataset.cardReveal === 'right' ? 'right' : 'left',
          }));
        // Give only the new viewport's cards their own snapshots. They can then
        // enter sideways while the rest of the section changes vertically.
        if (run.transition) run.cards.forEach(({ element, name }) => { element.style.viewTransitionName = name; });
      }
    };

    const fallback = async (run: Navigation) => {
      const direction = root.dataset.sectionDirection === 'up' ? -1 : 1;
      try {
        const outgoing = main.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
        run.animations.add(outgoing);
        await outgoing.finished;
        if (active !== run) return;
        commit(run);
        const effect = SECTION_EFFECTS[run.target.id] ?? 'slide';
        const incoming = main.animate(viewportFrames(effect === 'wipe' || effect === 'morph' ? 'scale' : effect, true, direction),
          { duration: 850, easing: TRANSITION_EASING });
        run.animations.add(incoming);
        const cards = run.cards.map(({ element, direction }, index) => {
          const animation = element.animate(cardEntranceFrames(direction, window.innerWidth <= 760), {
            duration: CARD_ENTRANCE_DURATION_MS, delay: Math.min(index, 3) * 110, easing: CARD_ENTRANCE_EASING, fill: 'backwards',
          });
          run.animations.add(animation);
          return animation;
        });
        outgoing.cancel();
        await Promise.all([incoming, ...cards].map(animation => animation.finished));
      } catch {
        // Input, a new destination, or a route change can cancel either stage.
        if (active === run && !run.committed) commit(run);
      } finally {
        finish(run);
      }
    };

    const navigate = (target: HTMLElement, delayMs = 0) => {
      cancel();
      const run: Navigation = { target, committed: false, frame: 0, timer: 0, animations: new Set(), cards: [] };
      active = run;
      const begin = () => {
        if (active !== run) return;
        if (media.matches || Math.abs(target.getBoundingClientRect().top - 80) < 12 || root.classList.contains('is-theme-switching')) {
          commit(run);
          finish(run);
          return;
        }
        root.dataset.sectionDirection = target.getBoundingClientRect().top < 0 ? 'up' : 'down';
        root.dataset.sectionDestination = target.id;
        root.dataset.sectionEffect = SECTION_EFFECTS[target.id] ?? 'slide';
        root.classList.add('is-section-switching');
        target.dataset.sectionLanding = '';
        // Allow React's link handler to close the menu before taking snapshots.
        run.frame = window.requestAnimationFrame(() => {
          if (active !== run) return;
          if (typeof document.startViewTransition !== 'function') {
            void fallback(run);
            return;
          }
          try {
            run.transition = document.startViewTransition(() => {
              if (active !== run) return;
              commit(run);
            });
            void run.transition.ready.then(() => {
              if (active !== run || media.matches) return;
              animateViewportTransition(SECTION_EFFECTS[target.id] ?? 'slide', root.dataset.sectionDirection === 'up' ? -1 : 1)
                .forEach(animation => run.animations.add(animation));
              run.cards.forEach(({ name, direction }, index) => {
                const animation = root.animate(cardEntranceFrames(direction, window.innerWidth <= 760), {
                  duration: CARD_ENTRANCE_DURATION_MS, delay: 80 + Math.min(index, 3) * 110,
                  easing: CARD_ENTRANCE_EASING, fill: 'both',
                  pseudoElement: `::view-transition-new(${name})`,
                });
                run.animations.add(animation);
              });
            }).catch(() => {});
            void run.transition.finished.then(() => finish(run), () => finish(run));
          } catch {
            void fallback(run);
          }
        });
      };
      if (delayMs && !media.matches) run.timer = window.setTimeout(begin, delayMs);
      else run.frame = window.requestAnimationFrame(begin);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (active?.committed) {
        replayHeaderClick(event, active.transition);
        cancel();
      }
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download') || anchor.classList.contains('skip-link')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || !url.hash) return;
      let id: string;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target || target === main || !main.contains(target)) return;
      event.preventDefault();
      navigate(target);
    };

    const onRequest = (event: Event) => {
      const { id, delayMs } = (event as CustomEvent<SectionNavigationRequest>).detail;
      const target = document.getElementById(id);
      if (!target || !main.contains(target)) return;
      event.preventDefault();
      navigate(target, delayMs);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) cancel();
    };
    const onMotionChange = () => {
      const run = active;
      cancel();
      if (media.matches && run && !run.committed) commit(run);
    };

    // Scroll-driven entrance applies to section surfaces, including their
    // backgrounds. Hero/showcase already have their own pinned choreography.
    const scenes = Array.from(main.querySelectorAll<HTMLElement>('section:not(#hero):not(#showcase):not([data-scroll-actor])'));
    scenes.forEach(section => { section.dataset.sectionScene = ''; });
    const sceneAnimations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;
    const configureScenes = () => {
      observer?.disconnect();
      sceneAnimations.forEach(animation => animation.cancel());
      sceneAnimations.clear();
      if (media.matches || CSS.supports('animation-timeline', 'view()') || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer?.unobserve(entry.target);
          const animation = (entry.target as HTMLElement).animate([
            { opacity: .3, translate: '0 32px' }, { opacity: 1, translate: '0 0' },
          ], { duration: 750, easing: 'cubic-bezier(.22, 1, .36, 1)' });
          sceneAnimations.add(animation);
          const release = () => sceneAnimations.delete(animation);
          animation.onfinish = release;
          animation.oncancel = release;
        });
      }, { threshold: .03 });
      scenes.forEach(section => observer?.observe(section));
    };
    configureScenes();

    document.addEventListener('click', onClick, true);
    window.addEventListener(SECTION_NAVIGATION_EVENT, onRequest);
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchmove', cancel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', cancel);
    window.addEventListener('resize', cancel);
    media.addEventListener('change', onMotionChange);
    media.addEventListener('change', configureScenes);
    return () => {
      cancel();
      observer?.disconnect();
      sceneAnimations.forEach(animation => animation.cancel());
      scenes.forEach(section => { delete section.dataset.sectionScene; });
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(SECTION_NAVIGATION_EVENT, onRequest);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchmove', cancel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', cancel);
      window.removeEventListener('resize', cancel);
      media.removeEventListener('change', onMotionChange);
      media.removeEventListener('change', configureScenes);
    };
  }, [pathname]);

  return null;
}

"use client";

import { useEffect, useRef } from 'react';
import { clamp, subscribeToScroll } from '../lib/scrollObserver';

const EASE = 'cubic-bezier(.16,1,.3,1)';

// Intro and scroll each own a separate wrapper; no transform is shared.
export function useHeroMotion() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const hero = ref.current;
    if (!hero) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width: 760px)');
    let hasPlayed = false;
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (reduced.matches) return;
      const animations = new Set<Animation>();
      const play = (element: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
        if (!element?.animate) return;
        const animation = element.animate(keyframes, { easing: EASE, ...options });
        animations.add(animation);
        animation.finished.then(() => { animations.delete(animation); animation.cancel(); }).catch(() => {});
      };
      if (!hasPlayed) {
        hasPlayed = true;
        hero.querySelectorAll('[data-hero-char]').forEach((element, index) => {
          play(element, [
            { transform: `translate3d(${(index % 3 - 1) * 20}px,115%,0) rotateX(-75deg) rotateZ(${index % 2 ? 9 : -9}deg)`, opacity: .2 },
            { transform: 'none', opacity: 1 },
          ], { duration: 1100, delay: 100 + index * 38, fill: 'backwards' });
        });
        hero.querySelectorAll('[data-hero-intro]').forEach((element, index) => {
          play(element, [{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 850, delay: 350 + index * 100, fill: 'backwards' });
        });
        hero.querySelectorAll('[data-orbit-intro]').forEach((element, index) => {
          play(element, [{ transform: `translate(${index % 2 ? -90 : 70}px,${index > 1 ? -65 : 60}px) scale(.45) rotate(-22deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1250, delay: 180 + index * 110, fill: 'backwards' });
        });
        play(hero.querySelector('[data-hero-core]'), [{ transform: 'rotate(25deg) scale(.2)', opacity: 0 }, { transform: 'rotate(-14deg) scale(1)', opacity: 1 }], { duration: 1300 });
        play(hero.querySelector('[data-hero-rule]'), [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: .75 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 1100 });
      }
      const title = hero.querySelector<HTMLElement>('[data-hero-title]')!;
      const universe = hero.querySelector<HTMLElement>('[data-hero-universe]')!;
      const blue = hero.querySelector<HTMLElement>('[data-hero-blue]')!;
      const peach = hero.querySelector<HTMLElement>('[data-hero-peach]')!;
      const cue = hero.querySelector<HTMLElement>('[data-hero-cue]')!;
      const orbits = [...hero.querySelectorAll<HTMLElement>('[data-orbit-depth]')];
      const modified = [title, universe, blue, peach, cue, ...orbits];
      const previousStyles = modified.map(element => element.getAttribute('style'));
      let frame = 0, previousTime = 0, progress = 0, target = 0;
      const request = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); };
      function tick(now: number) {
        frame = 0;
        const dt = previousTime ? Math.min(now - previousTime, 48) : 16.67;
        previousTime = now;
        progress += (target - progress) * (1 - Math.exp(-dt / 75));
        title.style.transform = `translate3d(0,${-progress * 70}px,0) rotateX(${progress * 10}deg)`;
        universe.style.transform = `translate3d(0,${-progress * 100}px,0) rotateZ(${progress * 12}deg)`;
        blue.style.opacity = String(1 - progress * .7);
        peach.style.opacity = String(progress);
        cue.style.opacity = String(1 - progress);
        orbits.forEach(element => {
          const depth = Number(element.dataset.orbitDepth);
          element.style.transform = `translate3d(${depth * progress * 35}px,${depth * progress * -85}px,0) rotate(${depth * progress * 18}deg)`;
        });
        if (Math.abs(target - progress) > .0003) request();
        else previousTime = 0;
      }
      const update = () => {
        const rect = hero.getBoundingClientRect();
        target = compact.matches ? 0 : clamp(-rect.top / Math.max(1, rect.height - innerHeight));
        request();
      };
      const unsubscribe = subscribeToScroll(update);
      const visibility = () => {
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
        else update();
      };
      document.addEventListener('visibilitychange', visibility);
      dispose = () => {
        unsubscribe();
        document.removeEventListener('visibilitychange', visibility);
        cancelAnimationFrame(frame);
        animations.forEach(animation => animation.cancel());
        modified.forEach((element, index) => {
          const style = previousStyles[index];
          if (style === null) element.removeAttribute('style');
          else element.setAttribute('style', style);
        });
      };
    };
    setup();
    reduced.addEventListener('change', setup);
    compact.addEventListener('change', setup);
    return () => { dispose(); reduced.removeEventListener('change', setup); compact.removeEventListener('change', setup); };
  }, []);
  return ref;
}

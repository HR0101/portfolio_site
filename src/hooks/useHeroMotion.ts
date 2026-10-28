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
            { transform: compact.matches ? 'translate3d(0,70%,0)' : `translate3d(${(index % 3 - 1) * 35}px,135%,0) rotateX(-85deg) rotateZ(${index % 2 ? 15 : -15}deg)`, opacity: .1 },
            { transform: 'none', opacity: 1 },
          ], { duration: compact.matches ? 750 : 1100, delay: 100 + index * 38, fill: 'backwards' });
        });
        hero.querySelectorAll('[data-hero-intro]').forEach((element, index) => {
          play(element, [{ transform: 'translateY(32px) scale(.97)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1000, delay: 350 + index * 110, fill: 'backwards' });
        });
        hero.querySelectorAll('[data-orbit-intro]').forEach((element, index) => {
          play(element, [{ transform: compact.matches ? `translateY(${index % 2 ? 20 : 30}px) scale(.8)` : `translate(${index % 2 ? -135 : 115}px,${index > 1 ? -110 : 100}px) scale(.25) rotate(${index % 2 ? 40 : -40}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: compact.matches ? 900 : 1450, delay: 180 + index * 120, fill: 'backwards' });
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
        title.style.transform = `translate3d(0,${-progress * 100}px,0) rotateX(${progress * 15}deg)`;
        universe.style.transform = `translate3d(0,${-progress * 150}px,0) rotateZ(${progress * 18}deg)`;
        blue.style.opacity = String(1 - progress * .7);
        peach.style.opacity = String(progress);
        cue.style.opacity = String(1 - progress);
        orbits.forEach(element => {
          const depth = Number(element.dataset.orbitDepth);
          element.style.transform = `translate3d(${depth * progress * 55}px,${depth * progress * -125}px,0) rotate(${depth * progress * 25}deg)`;
        });
        if (Math.abs(target - progress) > .0003) request();
        else previousTime = 0;
      }
      const update = () => {
        const rect = hero.getBoundingClientRect();
        target = compact.matches ? 0 : clamp(-rect.top / Math.max(1, rect.height - innerHeight));
        request();
      };
      // スマホではスクロールによるヒーローの変形を使わないため、購読もしない。
      const unsubscribe = compact.matches ? () => {} : subscribeToScroll(update);
      const stageObserver = new IntersectionObserver(([entry]) => {
        hero.toggleAttribute('data-hero-active', entry.isIntersecting);
      });
      stageObserver.observe(hero);
      const visibility = () => {
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
        else if (!compact.matches) update();
      };
      document.addEventListener('visibilitychange', visibility);
      dispose = () => {
        unsubscribe();
        stageObserver.disconnect();
        hero.removeAttribute('data-hero-active');
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

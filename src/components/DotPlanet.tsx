'use client';

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef } from 'react';
import { HERO_PLANET_APPS } from '../data/heroPlanetApps';
import { createDotPlanet } from '../lib/dotPlanetCanvas';
import { getPlanetLocation, projectPlanetPoints, type ProjectedPlanetPoint } from '../lib/planetPoints';

const APP_POINTS = HERO_PLANET_APPS.map(app => getPlanetLocation(app.latitude, app.longitude));

export interface PlanetFrame { left: number; top: number; size: number }
export interface DotPlanetHandle {
  setProgress: (progress: number) => void;
  setAutoRotate: (enabled: boolean) => void;
  setFrame: (frame: PlanetFrame) => void;
  setHeroVisibility: (visibility: number) => void;
  setDetail: (detail: number) => void;
  // 1 = ページの色（ライトでは黒い点）／0 = 暗い面の上（白い点＋暗い球の本体）．カードの中へ着地するときに 1 → 0 へ動かす
  setTone: (tone: number) => void;
  // 惑星の濃さ（0〜1）．名前の粒子へほどけていくあいだ，惑星の絵を薄れさせるのに使う
  setOpacity: (opacity: number) => void;
  // いま描いている向き（planetPoints の projectPlanetPoints に渡す進み具合と自転の角度）．別の描画が同じ向きの点を作るために使う
  getView: () => { progress: number; rotation: number };
}

export const DotPlanet = forwardRef<DotPlanetHandle, { className?: string }>(function DotPlanet({ className }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const atmosphere = useRef<SVGSVGElement>(null);
  const atmosphereId = `planet-${useId().replace(/:/g, '')}`;
  const renderer = useRef<ReturnType<typeof createDotPlanet>>(null);
  const progress = useRef(0);
  const autoRotate = useRef(false);
  const detail = useRef(1);
  const appHost = useRef<HTMLElement | null>(null);
  const appLinks = useRef<(HTMLAnchorElement | null)[]>([]);
  const appPoints = useRef<ProjectedPlanetPoint[]>([]);
  const currentFrame = useRef<PlanetFrame>({ left: 0, top: 0, size: 520 });
  const phase = useRef({ progress: 0, rotation: 0 });
  const interacting = useRef({ hover: false, focus: false });
  const syncRotation = useCallback(() => {
    renderer.current?.setAutoRotate(autoRotate.current && !interacting.current.hover && !interacting.current.focus);
  }, []);
  const positionApps = useCallback((value: number, rotation: number) => {
    phase.current.progress = value; phase.current.rotation = rotation;
    const points = projectPlanetPoints(APP_POINTS, value, 520, 520, appPoints.current, rotation);
    points.forEach((point, index) => {
      const link = appLinks.current[index];
      if (!link) return;
      const scale = .86 + Math.max(0, point.depth) * .2;
      const ratio = currentFrame.current.size / 520;
      link.style.transform = `translate3d(${point.x * ratio}px, ${point.y * ratio}px, 0) translate(-50%, -100%) scale(${scale})`;
      link.style.zIndex = String(Math.round((point.depth + 1) * 100));
      link.dataset.side = point.depth < 0 ? 'back' : 'front';
    });
  }, []);
  useImperativeHandle(ref, () => ({
    setProgress(value) { progress.current = value; renderer.current?.setProgress(value); },
    setDetail(value) {
      detail.current = value; renderer.current?.setDetail(value);
      if (atmosphere.current) atmosphere.current.style.opacity = String(value);
    },
    setOpacity(value) {
      if (canvas.current) canvas.current.style.opacity = String(Math.min(1, Math.max(0, value)));
    },
    getView() {
      return { progress: phase.current.progress, rotation: phase.current.rotation };
    },
    setTone(value) {
      canvas.current?.style.setProperty('--planet-tone', Math.min(1, Math.max(0, value)).toFixed(3));
    },
    setAutoRotate(enabled) {
      autoRotate.current = enabled;
      renderer.current?.setAutoRotate(enabled && !interacting.current.hover && !interacting.current.focus);
    },
    setHeroVisibility(value) {
      const element = appHost.current;
      if (!element) return;
      element.style.opacity = String(value);
      element.inert = value <= .01;
      element.setAttribute('aria-hidden', String(value <= .01));
    },
    setFrame(frame) {
      const element = canvas.current;
      if (!element) return;
      currentFrame.current = frame;
      element.style.transform = `translate3d(${frame.left}px, ${frame.top}px, 0) scale(${frame.size / 520})`;
      element.dataset.frameReady = 'true';
      renderer.current?.setDisplaySize(frame.size);
      if (atmosphere.current) {
        atmosphere.current.style.transform = element.style.transform;
        atmosphere.current.dataset.frameReady = 'true';
      }
      if (appHost.current) {
        appHost.current.style.transform = `translate3d(${frame.left}px, ${frame.top}px, 0)`;
        appHost.current.dataset.frameReady = 'true';
      }
      positionApps(phase.current.progress, phase.current.rotation);
    },
  }), [positionApps]);
  useEffect(() => {
    if (!canvas.current) return;
    // Keep the ordinary links immediately after Hero in DOM/tab order, while
    // this shared renderer owns their spherical positions and rotation phase.
    const host = document.querySelector<HTMLElement>('[data-planet-apps]');
    appHost.current = host;
    appLinks.current = Array.from(host?.querySelectorAll<HTMLAnchorElement>('.planet-hero-app') ?? []);
    const controller = new AbortController();
    const { signal } = controller;
    host?.addEventListener('pointerenter', () => { interacting.current.hover = true; syncRotation(); }, { signal });
    host?.addEventListener('pointerleave', () => { interacting.current.hover = false; syncRotation(); }, { signal });
    host?.addEventListener('focusin', () => { interacting.current.focus = true; syncRotation(); }, { signal });
    host?.addEventListener('focusout', event => {
      if (!(event.relatedTarget instanceof Node) || !host.contains(event.relatedTarget)) {
        interacting.current.focus = false; syncRotation();
      }
    }, { signal });
    const planet = createDotPlanet(canvas.current, positionApps);
    renderer.current = planet;
    planet?.setProgress(progress.current);
    planet?.setAutoRotate(autoRotate.current);
    planet?.setDetail(detail.current);
    planet?.setDisplaySize(currentFrame.current.size);
    return () => {
      controller.abort(); renderer.current = null; planet?.dispose();
      appHost.current = null; appLinks.current = [];
    };
  }, [positionApps, syncRotation]);
  return <>
    <svg ref={atmosphere} className="showcase-atmosphere" viewBox="0 0 520 520" aria-hidden="true">
      <defs>
        <radialGradient id={`${atmosphereId}-mask`}>
          <stop offset="80%" stopColor="white" stopOpacity="0" />
          <stop offset="87.8%" stopColor="white" stopOpacity=".7" />
          <stop offset="91%" stopColor="white" stopOpacity=".2" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${atmosphereId}-halo`}><rect width="520" height="520" fill={`url(#${atmosphereId}-mask)`} /></mask>
        <linearGradient id={`${atmosphereId}-color`} x1="15%" y1="0%" x2="65%" y2="100%">
          <stop offset="0%" stopColor="#ffb76b" />
          <stop offset="30%" stopColor="#e5a2a0" />
          <stop offset="55%" stopColor="#7e8bdf" />
          <stop offset="100%" stopColor="#215bff" />
        </linearGradient>
        <radialGradient id={`${atmosphereId}-body`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="var(--planet-body-center)" />
          <stop offset="100%" stopColor="var(--planet-body-edge)" />
        </radialGradient>
        <radialGradient id={`${atmosphereId}-haze`}>
          <stop offset="82%" stopColor="#2865ff" stopOpacity="0" />
          <stop offset="96%" stopColor="#2865ff" stopOpacity=".08" />
          <stop offset="100%" stopColor="#497fff" stopOpacity=".65" />
        </radialGradient>
      </defs>
      <rect width="520" height="520" fill={`url(#${atmosphereId}-color)`} mask={`url(#${atmosphereId}-halo)`} />
      <circle cx="260" cy="260" r="228.2" fill={`url(#${atmosphereId}-body)`} />
      <circle cx="260" cy="260" r="228.2" fill={`url(#${atmosphereId}-haze)`} />
      <circle cx="260" cy="260" r="228.2" fill="none" stroke={`url(#${atmosphereId}-color)`} strokeWidth="1.2" />
    </svg>
    <canvas ref={canvas} className={className} aria-hidden="true" data-testid="showcase-dot-planet" />
  </>;
});

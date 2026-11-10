"use client";

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { FEATURES } from '../../../config/features';
import { usePageRevealed } from '../../../hooks/usePageRevealed';
import {
  isFluidEnvironmentAllowed,
  isFluidPath,
  type FluidPoint,
} from '../../../lib/animations/fluid';
import { PRELOADING_CLASS } from '../../../lib/preloader';

// 何もない所で，マウスの動きに合わせて流れる流体の背景（FEATURES.fluidCursor）．
// ここは入口だけで，条件が合ったあとの最初のマウスの動きまで何も作らない．
// WebGL の本体（FluidCanvas）は next/dynamic の別チャンクで，最初の動きのあとに読み込む．
// 読み込みに失敗しても例外にしない（何も出さない）．
const FluidCanvas = dynamic(
  () => import('./FluidCanvas').catch(() => ({ default: () => null })),
  { ssr: false },
);

const HOVER_FINE_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
// 幅がこの値以上のときだけ出す（FLUID_MIN_VIEWPORT_WIDTH_PX と同じ値）
const WIDE_VIEWPORT_QUERY = '(min-width: 761px)';

export function FluidCursor() {
  const pathname = usePathname();
  const isRevealed = usePageRevealed();
  const [startPoint, setStartPoint] = useState<FluidPoint | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const isListening = FEATURES.fluidCursor && isRevealed && !isUnavailable && isFluidPath(pathname);

  const handleUnavailable = useCallback(() => setIsUnavailable(true), []);

  useEffect(() => {
    if (!isListening) return;
    const hoverQuery = window.matchMedia(HOVER_FINE_QUERY);
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const wideQuery = window.matchMedia(WIDE_VIEWPORT_QUERY);
    const controller = new AbortController();
    let gateController: AbortController | null = null;
    let isArmed = false;

    const readEnvironment = (preloading: boolean) => isFluidEnvironmentAllowed({
      featureEnabled: FEATURES.fluidCursor,
      reducedMotion: motionQuery.matches,
      hoverFine: hoverQuery.matches,
      viewportWidth: window.innerWidth,
      preloading,
      pathAllowed: true,
    });

    const detachGate = () => {
      gateController?.abort();
      gateController = null;
    };

    // 最初のマウスの動き（passive）．条件が合っていれば本体を読み込ませ，この入口の監視は外す
    const handleFirstMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const isPreloading = document.documentElement.classList.contains(PRELOADING_CLASS);
      if (!readEnvironment(isPreloading)) return;
      isArmed = true;
      detachGate();
      setStartPoint({ x: event.clientX, y: event.clientY });
    };

    // 出す条件（動きを減らす設定・タッチ端末・幅）が変わったら，監視と本体を合わせ直す
    const evaluate = () => {
      if (!readEnvironment(false)) {
        detachGate();
        isArmed = false;
        setStartPoint(null);
        return;
      }
      if (isArmed || gateController) return;
      gateController = new AbortController();
      document.addEventListener('pointermove', handleFirstMove, { passive: true, signal: gateController.signal });
    };

    evaluate();
    [hoverQuery, motionQuery, wideQuery].forEach((query) => {
      query.addEventListener('change', evaluate, { signal: controller.signal });
    });

    return () => {
      controller.abort();
      detachGate();
      setStartPoint(null);
    };
  }, [isListening]);

  if (!isListening || !startPoint) return null;
  return <FluidCanvas startPoint={startPoint} onUnavailable={handleUnavailable} />;
}

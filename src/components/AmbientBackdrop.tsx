"use client";

import { useScrollProgress } from '../hooks/useScrollProgress';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// ページ全体のスクロールで動かす距離（画面高さに対する割合）
const DRIFT_RATIO = 0.35;

// ページ背面でゆっくり移り変わる光．
// スクロール量に応じて色の重心が動き，section を跨いだつながりを出す．
export function AmbientBackdrop() {
  const progress = useScrollProgress();
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveProgress = prefersReducedMotion ? 0 : progress;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* 上から下へ降りてくる光 */}
      <div
        className="absolute left-[10%] w-[42vw] h-[42vw] rounded-full bg-mist/70 dark:bg-night-soft/50 blur-3xl"
        style={{ top: `${-10 + effectiveProgress * DRIFT_RATIO * 100}%` }}
      />
      {/* 下から上へ昇る光 */}
      <div
        className="absolute right-[8%] w-[38vw] h-[38vw] rounded-full bg-ink/4 dark:bg-night-ink/5 blur-3xl"
        style={{ bottom: `${-14 + effectiveProgress * DRIFT_RATIO * 90}%` }}
      />
      {/* 進むほど中央に寄る淡い光 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[30vw] h-[30vw] rounded-full bg-mist/50 dark:bg-night-soft/40 blur-3xl"
        style={{
          top: `${20 + Math.sin(effectiveProgress * Math.PI) * 30}%`,
          opacity: 0.4 + Math.sin(effectiveProgress * Math.PI) * 0.5,
        }}
      />
    </div>
  );
}

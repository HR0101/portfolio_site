// スクロール監視の共有基盤．
// 各コンポーネントが個別に scroll リスナーを張ると重くなるため，
// リスナーは1本だけにして requestAnimationFrame で間引き，購読者へ配る．

type ScrollListener = () => void;

const listeners = new Set<ScrollListener>();
let isAttached = false;
let animationFrameId = 0;

// 1フレームにつき1回だけ購読者へ通知する
function flushListeners(): void {
  animationFrameId = 0;
  listeners.forEach((listener) => listener());
}

function handleScrollEvent(): void {
  if (animationFrameId === 0) {
    animationFrameId = window.requestAnimationFrame(flushListeners);
  }
}

function attachIfNeeded(): void {
  if (isAttached || typeof window === 'undefined') {
    return;
  }
  window.addEventListener('scroll', handleScrollEvent, { passive: true });
  window.addEventListener('resize', handleScrollEvent, { passive: true });
  isAttached = true;
}

function detachIfUnused(): void {
  if (!isAttached || listeners.size > 0) {
    return;
  }
  window.removeEventListener('scroll', handleScrollEvent);
  window.removeEventListener('resize', handleScrollEvent);
  if (animationFrameId !== 0) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }
  isAttached = false;
}

// スクロール（およびリサイズ）の通知を購読する．戻り値を呼ぶと購読を解除する．
export function subscribeToScroll(listener: ScrollListener): () => void {
  listeners.add(listener);
  attachIfNeeded();
  // 購読直後に一度だけ現在値を反映させる
  listener();

  return () => {
    listeners.delete(listener);
    detachIfUnused();
  };
}

// 値を下限・上限の内側に丸める
export function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum);
}

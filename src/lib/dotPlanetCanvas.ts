import { createPlanetPoints, projectPlanetPoints, type ProjectedPlanetPoint } from './planetPoints';

export function createDotPlanet(canvas: HTMLCanvasElement, onDraw?: (progress: number, rotation: number) => void) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const points = createPlanetPoints(1800, 42000);
  const projected: ProjectedPlanetPoint[] = [];
  const buckets = Array.from({ length: 16 }, () => [] as number[]);
  let width = 0, height = 0, progress = 0, frame = 0, detail = 0, resolution = 0;
  // 小さく表示するとき（自己紹介のカードの中など）は，点が細かくなりすぎないよう，点を少し大きく描く
  let dotBoost = 1;
  let visible = false, disposed = false;
  let autoRotate = false, rotation = 0, previousTime = 0;

  const draw = (now: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden || !width || !height) return;
    // One turn in 80 seconds. Preserve the phase when scroll takes over, and
    // discard time spent hidden so resuming never jumps to a different angle.
    if (autoRotate && previousTime) rotation = (rotation + Math.min(now - previousTime, 64) * Math.PI * 2 / 80000) % (Math.PI * 2);
    previousTime = autoRotate ? now : 0;
    projectPlanetPoints(points, progress, width, height, projected, rotation, detail);
    context.clearRect(0, 0, width, height);
    buckets.forEach(bucket => { bucket.length = 0; });
    projected.forEach((dot, index) => {
      if (dot.alpha >= .015) buckets[Math.min(15, Math.floor(dot.alpha * 16))].push(index);
    });
    context.fillStyle = '#f2f2f2';
    buckets.forEach((bucket, index) => {
      context.globalAlpha = (index + .5) / 16;
      context.beginPath();
      for (const item of bucket) {
        const dot = projected[item];
        context.moveTo(dot.x + dot.radius * dotBoost, dot.y);
        context.arc(dot.x, dot.y, dot.radius * dotBoost, 0, Math.PI * 2);
      }
      context.fill();
    });
    context.globalAlpha = 1;
    onDraw?.(progress, rotation);
    if (autoRotate) request();
  };
  const request = () => {
    if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  };
  const growResolution = (displaySize: number) => {
    // 520px の表示で 1 倍．小さくなるほど増やす（220px で約 1.5 倍）
    const nextBoost = Math.max(1, 1 + (520 / Math.max(1, displaySize) - 1) * .35);
    if (Math.abs(nextBoost - dotBoost) > .02) { dotBoost = nextBoost; request(); }
    // Allocate for the large Hero once, then reuse that backing store during
    // the shrink. Never resize a bitmap on every scroll frame.
    const pixels = Math.min(2048, Math.max(128, Math.ceil(displaySize * Math.min(devicePixelRatio || 1, 2) / 128) * 128));
    if (pixels <= resolution) return;
    resolution = pixels;
    width = 520; height = 520;
    canvas.width = pixels; canvas.height = pixels;
    context.setTransform(pixels / 520, 0, 0, pixels / 520, 0, 0);
    request();
  };
  const resize = () => growResolution(canvas.getBoundingClientRect().width);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request();
    else { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
  });
  intersection.observe(canvas);
  const visibility = () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    else request();
  };
  document.addEventListener('visibilitychange', visibility);
  resize();
  return {
    setDisplaySize: growResolution,
    setDetail(value: number) {
      const next = Math.min(1, Math.max(0, value));
      if (detail === next) return;
      detail = next; request();
    },
    setAutoRotate(enabled: boolean) {
      if (autoRotate === enabled) return;
      autoRotate = enabled; previousTime = 0; request();
    },
    setProgress(value: number) {
      const next = Math.min(1, Math.max(0, value));
      if (progress === next) return;
      progress = next; request();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.width = 0; canvas.height = 0;
    },
  };
}

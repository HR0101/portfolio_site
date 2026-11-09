import {
  resetWordmarkParticles,
  stepWordmarkParticles,
  type ParticlePointer,
  type WordmarkParticle,
} from './wordmarkParticles';
import { subscribeToScroll } from './scrollObserver';
import { createPlanetPoints, projectPlanetPoints, type PlanetPoint, type ProjectedPlanetPoint } from './planetPoints';
import { createMergePlan, evaluateMergeDot, type MergeDot, type MergeState } from './wordmarkMerge';

// 粒子の最大変位より広い余白を描画面に持たせ，文字の外へ散った点も見せる．
export const WORDMARK_PARTICLE_PADDING = 100;
const POINTER_ACTIVE_MS = 150;

// 点描の惑星がほどけて名前の粒子になっていくあいだ（PlanetTail が 'wordmark-merge' で知らせる）の描画
export const WORDMARK_MERGE_EVENT = 'wordmark-merge';
export interface WordmarkMergeDetail {
  // 進み具合（0 = 惑星のまま，1 = 名前の粒子になった）
  progress: number;
  // いまの惑星の枠（ビューポートの座標）と，向き（DotPlanet の getView の値）
  frame: { left: number; top: number; size: number };
  view: { progress: number; rotation: number };
  // 点を描く，画面いっぱいの重ね canvas（ビューポートの座標）．惑星は名前の canvas の外から動き出すので，
  // 名前の canvas（名前の周り 100px だけ）には収まらない
  overlay: HTMLCanvasElement | null;
}
// 惑星の描画で使う，ある基準の大きさ（DotPlanet と同じ論理サイズ）と，海の点の数
const PLANET_LOGICAL_SIZE = 520;
const PLANET_OCEAN_DOTS = 1800;
// 惑星の点（暗い球の上の白い点）の色．混ざるにつれて，名前の粒子の色へ寄せる
const PLANET_DOT_COLOR: readonly [number, number, number] = [242, 242, 242];
// 散る距離の基準（名前の高さに対する割合）
const MERGE_SPREAD_RATIO = 0.14;
// 色の混ざり具合と濃さを，この段階数に分けて，同じ色・濃さの点を 1 回の塗りでまとめて描く（点の数だけ塗らない）
const MERGE_COLOR_LEVELS = 8;
const MERGE_ALPHA_LEVELS = 5;
// 惑星の点の大きさを，小さく表示するときに持ち上げる割合（DotPlanet の dotBoost と同じ式）
const mergeDotBoost = (displaySize: number) => Math.max(1, 1 + (PLANET_LOGICAL_SIZE / Math.max(1, displaySize) - 1) * 0.35);

// rgb(...) / color(srgb ...) の色の文字列を，0〜255 の三つ組にする
function parseCssRgb(value: string): readonly [number, number, number] {
  const numbers = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!numbers || numbers.length < 3 || numbers.some(Number.isNaN)) return [0, 0, 0];
  const factor = value.startsWith('color(') ? 255 : 1;
  return [Math.round(numbers[0] * factor), Math.round(numbers[1] * factor), Math.round(numbers[2] * factor)];
}
const mixChannel = (from: number, to: number, amount: number) => Math.round(from + (to - from) * amount);

export function createParticleWordmark(
  host: HTMLElement,
  text: HTMLElement,
  canvas: HTMLCanvasElement,
): () => void {
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const controller = new AbortController();
  const { signal } = controller;
  let particles: WordmarkParticle[] = [];
  let visible = false;
  let ready = false;
  let width = 0;
  let height = 0;
  let radius = 1;
  let ink = '';
  let accent = '';
  let frame = 0;
  let rebuildFrame = 0;
  let previousTime = 0;
  let pointer: ParticlePointer | null = null;
  let pointerAt = 0;
  let clientPointer: { x: number; y: number } | null = null;
  let sampledClientPointer: { x: number; y: number } | null = null;
  let merge: WordmarkMergeDetail | null = null;
  let mergePlan: MergeDot[] = [];
  let mergePlanFor: WordmarkParticle[] | null = null;
  let planetPoints: PlanetPoint[] | null = null;
  const planetProjected: ProjectedPlanetPoint[] = [];
  const mergeState: MergeState = { x: 0, y: 0, mix: 0, alpha: 1 };

  // 惑星がバラバラにほどけ，名前の粒子の置かれている場所へ流れ込んで，文字が現れる．
  // 名前の粒子 1 つ 1 つが，惑星の点のどれかから出てくる（惑星の絵と同じ向きの点を作って，同じ位置から始める）
  const drawMerge = () => {
    const overlay = merge?.overlay;
    const overlayContext = overlay?.getContext('2d');
    if (!merge || !overlay || !overlayContext) return;
    const overlayRatio = overlay.width / Math.max(1, overlay.clientWidth);
    overlayContext.setTransform(1, 0, 0, 1, 0, 0);
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    if (merge.progress <= 0 || merge.progress >= 1) return;
    overlayContext.setTransform(overlayRatio, 0, 0, overlayRatio, 0, 0);
    planetPoints ??= createPlanetPoints(PLANET_OCEAN_DOTS, 0);
    if (mergePlanFor !== particles) {
      mergePlan = createMergePlan(planetPoints.length, particles.map(particle => ({ x: particle.originX, y: particle.originY, accent: particle.accent })));
      mergePlanFor = particles;
    }
    const bounds = canvas.getBoundingClientRect();
    const scale = merge.frame.size / PLANET_LOGICAL_SIZE;
    const boost = mergeDotBoost(merge.frame.size);
    projectPlanetPoints(planetPoints, merge.view.progress, PLANET_LOGICAL_SIZE, PLANET_LOGICAL_SIZE, planetProjected, merge.view.rotation, 0);
    const inkRgb = parseCssRgb(ink);
    const accentRgb = parseCssRgb(accent);
    const spread = host.clientHeight * MERGE_SPREAD_RATIO;
    // 同じ色・濃さの点をまとめて描く：色（墨色／章の色）×混ざり具合の段階×濃さの段階
    const levels = MERGE_COLOR_LEVELS;
    const alphaLevels = MERGE_ALPHA_LEVELS;
    const buckets: number[][] = Array.from({ length: levels * 2 * alphaLevels }, () => []);
    const x: number[] = new Array(mergePlan.length);
    const y: number[] = new Array(mergePlan.length);
    const size: number[] = new Array(mergePlan.length);
    mergePlan.forEach((dot, index) => {
      const projected = planetProjected[dot.source];
      if (!projected) return;
      evaluateMergeDot(
        dot,
        merge!.frame.left + projected.x * scale - bounds.left,
        merge!.frame.top + projected.y * scale - bounds.top,
        merge!.progress, spread, mergeState,
      );
      x[index] = mergeState.x;
      y[index] = mergeState.y;
      // 惑星の上では，その点の濃さ・大きさ（裏側の点は薄い）．名前の粒子になるにつれて，名前の粒子の濃さ・大きさへ
      const startRadius = projected.radius * scale * boost;
      size[index] = Math.max(0.3, startRadius + (radius - startRadius) * mergeState.mix);
      const alpha = (projected.alpha + (1 - projected.alpha) * mergeState.mix) * mergeState.alpha;
      const colorSlot = (dot.accent ? levels : 0) + Math.min(levels - 1, Math.floor(mergeState.mix * levels));
      buckets[colorSlot * alphaLevels + Math.min(alphaLevels - 1, Math.floor(alpha * alphaLevels))].push(index);
    });
    buckets.forEach((bucket, slot) => {
      if (!bucket.length) return;
      const colorSlot = Math.floor(slot / alphaLevels);
      const target = colorSlot >= levels ? accentRgb : inkRgb;
      const amount = ((colorSlot % levels) + 0.5) / levels;
      overlayContext.fillStyle = `rgb(${mixChannel(PLANET_DOT_COLOR[0], target[0], amount)} ${mixChannel(PLANET_DOT_COLOR[1], target[1], amount)} ${mixChannel(PLANET_DOT_COLOR[2], target[2], amount)})`;
      overlayContext.globalAlpha = ((slot % alphaLevels) + 0.5) / alphaLevels;
      overlayContext.beginPath();
      for (const index of bucket) {
        // 名前の canvas の座標から，ビューポートの座標へ戻して描く
        const viewportX = x[index] + bounds.left;
        const viewportY = y[index] + bounds.top;
        overlayContext.moveTo(viewportX + size[index], viewportY);
        overlayContext.arc(viewportX, viewportY, size[index], 0, Math.PI * 2);
      }
      overlayContext.fill();
    });
    overlayContext.globalAlpha = 1;
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    // 同じ色の点をまとめて描き，点の数だけfillを呼ばない．
    // 点描の惑星から文字が現れるまでは，名前の粒子を描かない（何もなかった場所に，惑星が大きくなって現れる）
    const forming = host.hasAttribute('data-wordmark-forming');
    for (const isAccent of [false, true]) {
      if (forming) continue;
      context.fillStyle = isAccent ? accent : ink;
      context.beginPath();
      for (const particle of particles) {
        if (particle.accent !== isAccent) continue;
        context.moveTo(particle.x + radius, particle.y);
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      }
      context.fill();
    }
    drawMerge();
  };
  const readColors = () => {
    const letters = text.querySelectorAll<HTMLElement>('[data-footer-letter]');
    ink = getComputedStyle(text).color;
    accent = letters.length ? getComputedStyle(letters[letters.length - 1]).color : ink;
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };
  const restore = () => {
    pointer = null;
    clientPointer = null;
    sampledClientPointer = null;
    stop();
    resetWordmarkParticles(particles);
    if (ready) draw();
  };
  const fallback = () => {
    ready = false;
    stop();
    host.removeAttribute('data-particle-ready');
  };
  function tick(now: number) {
    frame = 0;
    if (!visible || !ready || document.hidden) return;
    const elapsed = previousTime ? (now - previousTime) / 1000 : 1 / 60;
    previousTime = now;
    // マウスを止めた後も反発させ続けず，元の字形へ戻す．
    const moving = stepWordmarkParticles(particles, now - pointerAt < POINTER_ACTIVE_MS ? pointer : null, elapsed);
    // 同じ軌跡の衝撃を次のフレームで繰り返さず，新しい移動だけを拾う．
    sampledClientPointer = clientPointer;
    if (pointer) {
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
    }
    draw();
    if (moving) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }
  const wake = () => {
    if (visible && ready && !document.hidden && !frame) frame = requestAnimationFrame(tick);
  };
  const updatePointer = () => {
    if (!clientPointer || !visible || !ready) return;
    const bounds = canvas.getBoundingClientRect();
    pointer = {
      x: clientPointer.x - bounds.left,
      y: clientPointer.y - bounds.top,
      previousX: (sampledClientPointer ?? clientPointer).x - bounds.left,
      previousY: (sampledClientPointer ?? clientPointer).y - bounds.top,
      radius: Math.min(105, Math.max(70, host.clientHeight * 0.4)),
    };
  };

  const rebuild = () => {
    rebuildFrame = 0;
    if (signal.aborted || !visible) return;
    restore();
    try {
      const padding = WORDMARK_PARTICLE_PADDING;
      const bounds = host.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) { fallback(); return; }
      width = Math.ceil(bounds.width + padding * 2);
      height = Math.ceil(bounds.height + padding * 2);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(width * ratio);
      canvas.height = Math.ceil(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const mask = document.createElement('canvas');
      mask.width = width;
      mask.height = height;
      const raster = mask.getContext('2d', { willReadFrequently: true });
      if (!raster) { fallback(); return; }
      const glyphs = [...text.querySelectorAll<HTMLElement>('.footer-wordmark-char')];
      const style = getComputedStyle(text);
      const fontSize = parseFloat(style.fontSize);
      raster.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      raster.fillStyle = '#000';
      raster.textBaseline = 'alphabetic';
      const metrics = raster.measureText('Hg');
      const ascent = metrics.fontBoundingBoxAscent ?? fontSize * 0.8;
      const descent = metrics.fontBoundingBoxDescent ?? fontSize * 0.2;
      const textY = text.offsetTop + padding;
      // DOMで測った文字ごとの配置を使い，既存の詰めと余白を維持する．
      for (const glyph of glyphs) {
        const baseline = textY + glyph.offsetTop + (glyph.offsetHeight - ascent - descent) / 2 + ascent;
        raster.fillStyle = glyph.classList.contains('is-accent') ? '#f00' : '#000';
        raster.fillText(glyph.textContent ?? '', padding + text.offsetLeft + glyph.offsetLeft, baseline);
      }
      const pixels = raster.getImageData(0, 0, width, height).data;
      const gap = Math.max(4, Math.ceil(Math.sqrt(bounds.width * bounds.height / 18_000)));
      radius = Math.min(1.25, gap * 0.26);
      particles = [];
      for (let y = padding; y < height - padding; y += gap) {
        for (let x = padding; x < width - padding; x += gap) {
          const pixel = (y * width + x) * 4;
          if (pixels[pixel + 3] < 128) continue;
          particles.push({ originX: x, originY: y, x, y, vx: 0, vy: 0, accent: pixels[pixel] > 127 });
        }
      }
      if (!particles.length) { fallback(); return; }
      readColors();
      draw();
      ready = true;
      // 描画できたことを確認してからHTMLを隠す．初期化失敗で名前を空白にしない．
      host.setAttribute('data-particle-ready', '');
    } catch {
      fallback();
    }
  };
  const queueRebuild = () => {
    if (!signal.aborted && visible && !rebuildFrame) rebuildFrame = requestAnimationFrame(rebuild);
  };
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !visible || !ready) return;
    clientPointer = { x: event.clientX, y: event.clientY };
    sampledClientPointer ??= clientPointer;
    pointerAt = performance.now();
    updatePointer();
    wake();
  }, { signal, passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    pointer = null; clientPointer = null; sampledClientPointer = null; wake();
  }, { signal });
  // 名前を隠す・見せるを切り替えたときに，描き直す（PlanetTail が送る）
  host.addEventListener('wordmark-redraw', () => { if (ready) draw(); }, { signal });
  // 惑星が名前の粒子に混ざっていく動き（PlanetTail が，進み具合と惑星の枠・向きを送る）
  host.addEventListener(WORDMARK_MERGE_EVENT, event => {
    merge = (event as CustomEvent<WordmarkMergeDetail>).detail;
    if (ready) draw();
  }, { signal });
  window.addEventListener('blur', restore, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) restore(); }, { signal });
  // スクロールで文字の画面内位置が変わっても，反発の中心をずらさない．
  const unsubscribe = subscribeToScroll(() => { updatePointer(); wake(); });
  const resize = new ResizeObserver(queueRebuild);
  resize.observe(host);
  const theme = new MutationObserver(() => {
    if (!ready) return;
    readColors();
    draw();
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  // 画面の下 1 画面分までを「見えている」ことにして，粒子を早めに用意する（フッターへ向かう惑星が，名前の粒子へほどけ始めるため）
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) queueRebuild();
    else restore();
  }, { rootMargin: '0px 0px 100% 0px' });
  intersection.observe(host);
  void document.fonts.ready.then(queueRebuild);
  document.fonts.addEventListener('loadingdone', queueRebuild, { signal });

  return () => {
    controller.abort();
    unsubscribe();
    resize.disconnect();
    theme.disconnect();
    intersection.disconnect();
    cancelAnimationFrame(rebuildFrame);
    stop();
    host.removeAttribute('data-particle-ready');
  };
}

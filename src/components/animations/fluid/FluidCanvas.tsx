"use client";

import { useEffect, useRef } from 'react';
import {
  FLUID_ALPHA_GAIN_WITHOUT_DISTORTION,
  FLUID_LAYER_MODE,
  FLUID_LAYER_Z_INDEX,
  FLUID_MEASURE_FRAMES,
  FLUID_QUALITY_TIERS,
  FLUID_STROKE_GAP_MS,
  getDyeHue,
  getFluidColors,
  getFluidStepSec,
  getNextQualityTier,
  getPointerSplats,
  isFluidAsleep,
  pickInitialQualityTier,
  shouldSkipFrame,
  type FluidPoint,
} from '../../../lib/animations/fluid';
import { PRELOADING_CLASS } from '../../../lib/preloader';
import { createFluidDistortion, type FluidDistortion } from './fluidDistortion';
import { createFluidEngine, type FluidEngine } from './fluidEngine';
import styles from './FluidCanvas.module.css';

// 流体の背景の本体（WebGL）．FluidCursor が最初のマウスの動きのあとに別チャンクとして読み込む．
// 動きが止まって染料が見えなくなったら描画を止めて眠り，次のマウスの動きで起きる．

// 大きさの変化を受けて作り直すまでの待ち時間（ms）．ウィンドウを引き伸ばしている間は作り直さない
const RESIZE_DEBOUNCE_MS = 150;
// 描画間隔がこれ以上開いたコマは，品質の測定に使わない（タブの切り替えなどの飛び）
const MEASURE_MAX_FRAME_MS = 100;
// 画面の大きさがこれ以上変わったら作り直す（px）
const RESIZE_THRESHOLD_PX = 1;
const ACCENT_VARIABLE = '--site-accent';

interface FluidCanvasProps {
  // 最初に動いたときのマウスの位置
  startPoint: FluidPoint;
  // 使えない環境だったとき（WebGL2 が無い等）に呼ぶ．呼ばれた側が canvas を外し，二度と出さない
  onUnavailable: () => void;
}

interface DeviceMemoryNavigator extends Navigator {
  deviceMemory?: number;
}

export default function FluidCanvas({ startPoint, onUnavailable }: FluidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 最初の描画時の値だけを使う（親の再描画で効果を作り直さない）
  const startPointRef = useRef(startPoint);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    const controller = new AbortController();
    const { signal } = controller;

    // ページを歪ませる層（Chromium のみ．使えなければ null で，染料の絵だけを出す）
    const distortion = createFluidDistortion() as FluidDistortion | null;

    const readColors = () => {
      const colors = getFluidColors(root.classList.contains('dark'), getComputedStyle(root).getPropertyValue(ACCENT_VARIABLE));
      return distortion ? colors : { ...colors, maxAlpha: colors.maxAlpha * FLUID_ALPHA_GAIN_WITHOUT_DISTORTION };
    };

    // クロージャの中で代入するので，型を null に狭められないようにする
    let engine = null as FluidEngine | null;
    let tier = pickInitialQualityTier({
      cores: navigator.hardwareConcurrency,
      memoryGb: (navigator as DeviceMemoryNavigator).deviceMemory,
    });
    let viewport = { width: canvas.clientWidth || window.innerWidth, height: canvas.clientHeight || window.innerHeight };
    let frame = 0;
    let lastFrameMs = 0;
    let lastInjectMs = Number.NEGATIVE_INFINITY;
    // ポインタ：いちばん新しい位置と，前のコマで処理し終えた位置
    let pointer: FluidPoint = { ...startPointRef.current };
    let processed: FluidPoint | null = { ...startPointRef.current };
    let lastEventPoint: FluidPoint = { ...startPointRef.current };
    let lastEventMs = performance.now();
    // 品質の測定
    let measuredMs = 0;
    let measuredFrames = 0;
    let resizeTimer = 0;

    // 眠っているあいだは canvas を隠す（ブレンドの合成や描画の負荷を残さない）
    let isShown = false;
    const setShown = (next: boolean) => {
      if (isShown === next) return;
      isShown = next;
      canvas.style.visibility = next ? 'visible' : 'hidden';
    };

    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastFrameMs = 0;
    };

    // 眠る：描画を止め，染料を消して透明な絵にする
    const sleep = () => {
      stopFrame();
      engine?.clear();
      distortion?.hide();
      setShown(false);
      measuredMs = 0;
      measuredFrames = 0;
    };

    const rebuild = (): boolean => {
      if (!engine) return false;
      const isReady = engine.resize(viewport.width, viewport.height, tier);
      lastInjectMs = Number.NEGATIVE_INFINITY;
      return isReady;
    };

    const measureFrame = (frameMs: number) => {
      if (frameMs >= MEASURE_MAX_FRAME_MS) return;
      measuredMs += frameMs;
      measuredFrames += 1;
      if (measuredFrames < FLUID_MEASURE_FRAMES) return;
      const nextTier = getNextQualityTier(tier, measuredMs / measuredFrames);
      measuredMs = 0;
      measuredFrames = 0;
      if (nextTier === tier || nextTier >= FLUID_QUALITY_TIERS.length) return;
      tier = nextTier;
      rebuild();
    };

    const tick = (now: number) => {
      frame = 0;
      if (!engine || document.hidden) {
        sleep();
        return;
      }
      if (shouldSkipFrame(now, lastFrameMs)) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const frameMs = lastFrameMs ? now - lastFrameMs : 1000 / 60;
      lastFrameMs = now;
      measureFrame(frameMs);
      const stepSec = getFluidStepSec(frameMs);

      // ポインタが実際に動いた分だけ，染料と速度を置く（スクロールで要素が下を流れるだけでは何も置かない）
      if (processed) {
        const splats = getPointerSplats(processed, pointer, stepSec, viewport, getDyeHue(now / 1000));
        if (splats.length > 0) {
          setShown(true);
          engine.inject(splats);
          lastInjectMs = now;
        }
      }
      processed = { ...pointer };

      engine.step(stepSec);
      if (distortion && !isFluidAsleep(now, lastInjectMs)) {
        const map = engine.readDisplacement();
        if (map) distortion.update(map);
      }
      if (isFluidAsleep(now, lastInjectMs)) {
        sleep();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const requestFrame = () => {
      if (!frame && engine && !document.hidden) frame = requestAnimationFrame(tick);
    };

    // document に張るリスナーは，この passive な pointermove の 1 本だけ
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      if (root.classList.contains(PRELOADING_CLASS)) return;
      const { clientX, clientY } = event;
      // 位置が同じ移動は，スクロールや要素の移動でブラウザが合成したもの．ポインタは動いていない
      if (clientX === lastEventPoint.x && clientY === lastEventPoint.y) return;
      // 時刻はイベントの timeStamp ではなく performance.now() で測る（描画のコマと同じ時間軸にそろえる）
      const eventMs = performance.now();
      const isNewStroke = eventMs - lastEventMs > FLUID_STROKE_GAP_MS;
      pointer = { x: clientX, y: clientY };
      // 途切れたあとの最初の動きは，離れた場所からの線にしない
      if (isNewStroke || !processed) processed = { ...pointer };
      lastEventPoint = pointer;
      lastEventMs = eventMs;
      requestFrame();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) sleep();
    };

    const createEngine = (): boolean => {
      engine?.dispose();
      engine = createFluidEngine(canvas, readColors());
      if (!engine) return false;
      return engine.resize(viewport.width, viewport.height, tier);
    };

    if (!createEngine()) {
      engine?.dispose();
      engine = null;
      onUnavailableRef.current();
      return;
    }

    document.addEventListener('pointermove', handlePointerMove, { passive: true, signal });
    document.addEventListener('visibilitychange', handleVisibilityChange, { signal });

    // WebGL のコンテキストが失われたら止め，戻ったら作り直す（失われている間は何も出さない）
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      stopFrame();
    }, { signal });
    canvas.addEventListener('webglcontextrestored', () => {
      if (!createEngine()) {
        engine = null;
        onUnavailableRef.current();
      }
    }, { signal });

    // テーマ（html.dark）の切り替えに，染料の色を合わせる
    const themeObserver = new MutationObserver(() => engine?.setColors(readColors()));
    themeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });

    // 画面の大きさが変わったら，格子を作り直す
    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      if (Math.abs(rect.width - viewport.width) < RESIZE_THRESHOLD_PX && Math.abs(rect.height - viewport.height) < RESIZE_THRESHOLD_PX) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        viewport = { width: rect.width, height: rect.height };
        sleep();
        rebuild();
      }, RESIZE_DEBOUNCE_MS);
    });
    resizeObserver.observe(canvas);

    return () => {
      controller.abort();
      themeObserver.disconnect();
      resizeObserver.disconnect();
      window.clearTimeout(resizeTimer);
      stopFrame();
      distortion?.dispose();
      engine?.dispose();
      engine = null;
    };
  }, []);

  // 位置・大きさ・重なりは，スタイルシートの読み込み前でも崩れないよう，インラインでも指定する
  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      style={CANVAS_STYLE}
      data-layer={FLUID_LAYER_MODE}
      aria-hidden="true"
    />
  );
}

const CANVAS_STYLE = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  zIndex: FLUID_LAYER_Z_INDEX[FLUID_LAYER_MODE],
  pointerEvents: 'none',
  // 染料を置くまでは隠しておく（眠るときも隠す）
  visibility: 'hidden',
} as const;

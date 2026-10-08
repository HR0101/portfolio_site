'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useTheme } from '../../../hooks/useTheme';
import styles from './product.module.css';

// 経糸（縦糸）の本数．細い糸を多く通したほうが，布の面として落ち着く
const WARP_COUNT = 48;
// 緯糸（横糸）1本ぶんのおおよその高さ（CSS ピクセル）
const WEFT_PITCH_PX = 7;
// 経糸1本を縦にいくつへ刻んで濃淡をつけるか（紬の「節」の表現）
const WARP_SEGMENTS = 16;
// キャンバスの縦横比（幅に対する高さの割合）
const CANVAS_RATIO = 0.62;
// 値を変えたときに追従する速さ（1フレームあたりの補間率）
const EASING_RATE = 0.12;
// 補間を打ち切って目標値に合わせる差分のしきい値
const SNAP_THRESHOLD = 0.4;

// HSL 色（色相・彩度・明度）
type Hsl = readonly [number, number, number];

interface WeavePalette {
  ground: string;
  // 信頼度が高いときの経糸（藍）と，低いときの経糸（鼠色）
  warpHigh: Hsl;
  warpLow: Hsl;
  // 鮮度が高いときの緯糸（金茶）と，低いときの緯糸（褪せた色）
  weftHigh: Hsl;
  weftLow: Hsl;
  // 布の上に落とす影と，紙の粒
  shade: string;
  grain: string;
}

const LIGHT_PALETTE: WeavePalette = {
  ground: '#ece3d2',
  warpHigh: [207, 40, 33],
  warpLow: [210, 7, 57],
  weftHigh: [36, 57, 49],
  weftLow: [34, 6, 64],
  shade: 'rgba(38, 30, 18, 0.10)',
  grain: 'rgba(255, 252, 245, 0.55)',
};

const DARK_PALETTE: WeavePalette = {
  ground: '#171410',
  warpHigh: [205, 45, 54],
  warpLow: [208, 9, 34],
  weftHigh: [38, 52, 55],
  weftLow: [36, 7, 33],
  shade: 'rgba(0, 0, 0, 0.28)',
  grain: 'rgba(255, 246, 228, 0.05)',
};

// 実際の記事を診断したときの値を，そのまま手本として置く
const PRESETS = [
  { label: '出典が明快な記事', credibility: 88, freshness: 94 },
  { label: '2023年のAI解説', credibility: 56, freshness: 0 },
  { label: '出典のない速報', credibility: 34, freshness: 76 },
] as const;

// 同じ入力からは必ず同じ織りが生まれるようにする決定論的な擬似乱数
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// 2色を割合 ratio で混ぜ，明度に揺らぎを加えた CSS 色を返す
function blendThread(low: Hsl, high: Hsl, ratio: number, lightnessShift: number, alpha: number) {
  const hue = low[0] + (high[0] - low[0]) * ratio;
  const saturation = low[1] + (high[1] - low[1]) * ratio;
  const lightness = low[2] + (high[2] - low[2]) * ratio + lightnessShift;
  return `hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${lightness.toFixed(1)}%, ${alpha.toFixed(3)})`;
}

// 布の一枚を描く．credibility / freshness は 0〜100，reveal は織り上がりの割合 0〜1
function drawCloth(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  credibility: number,
  freshness: number,
  reveal: number,
  palette: WeavePalette,
) {
  const trust = Math.min(1, Math.max(0, credibility / 100));
  const fresh = Math.min(1, Math.max(0, freshness / 100));
  const cellWidth = width / WARP_COUNT;
  const rowCount = Math.max(8, Math.round(height / WEFT_PITCH_PX));
  const cellHeight = height / rowCount;
  const visibleRows = Math.ceil(rowCount * reveal);

  context.clearRect(0, 0, width, height);
  context.fillStyle = palette.ground;
  context.fillRect(0, 0, width, height);

  // 1. 織機に張った経糸（信頼度）．紬らしさは「節」から生まれるので，
  //    糸ごとに太さを変え，さらに縦方向を刻んで濃淡をつける
  const warpRandom = createRandom(1811 + Math.round(credibility));
  const baseWarpWidth = cellWidth * (0.62 + 0.26 * trust);
  const warpWidths: number[] = [];
  const warpShifts: number[] = [];
  for (let column = 0; column < WARP_COUNT; column += 1) {
    const slub = warpRandom() < 0.2 ? 1.5 : 0.86 + warpRandom() * 0.3;
    warpWidths[column] = Math.min(cellWidth * 0.96, baseWarpWidth * slub);
    warpShifts[column] = (warpRandom() - 0.5) * (17 - 10 * trust);
  }

  const segmentRandom = createRandom(5501 + Math.round(credibility));
  const segmentHeight = height / WARP_SEGMENTS;
  for (let column = 0; column < WARP_COUNT; column += 1) {
    const x = column * cellWidth + (cellWidth - warpWidths[column]) / 2;
    for (let segment = 0; segment < WARP_SEGMENTS; segment += 1) {
      // 区間ごとのわずかな濃淡が，手で紡いだ糸のムラに見える
      const shift = warpShifts[column] + (segmentRandom() - 0.5) * (9 - 5 * trust);
      const alpha = (0.62 + 0.3 * trust) * (0.86 + segmentRandom() * 0.22);
      context.fillStyle = blendThread(palette.warpLow, palette.warpHigh, trust, shift, alpha);
      context.fillRect(x, segment * segmentHeight, warpWidths[column], segmentHeight + 1);
    }
  }

  // 2. 緯糸（鮮度）は控えめに重ね，布の「段」として見せる
  const weftRandom = createRandom(907 + Math.round(freshness));
  for (let row = 0; row < visibleRows; row += 1) {
    const slub = weftRandom() < 0.18 ? 1.45 : 1;
    const weftHeight = Math.min(cellHeight * 0.9, cellHeight * (0.4 + 0.24 * fresh) * slub);
    const shift = (weftRandom() - 0.5) * (16 - 10 * fresh);
    const alpha = 0.2 + 0.28 * fresh;
    context.fillStyle = blendThread(palette.weftLow, palette.weftHigh, fresh, shift, alpha);
    context.fillRect(0, row * cellHeight + (cellHeight - weftHeight) / 2, width, weftHeight);
  }

  // 3. 平織りの交差．経糸が上にくるマスへ薄く重ね，縦の流れを断たずに織り目を出す
  const crossRandom = createRandom(4231 + Math.round(credibility) * 7 + Math.round(freshness));
  for (let row = 0; row < visibleRows; row += 1) {
    for (let column = 0; column < WARP_COUNT; column += 1) {
      if ((row + column) % 2 !== 0) {
        continue;
      }
      // 信頼度が低いほど，糸が飛んだ「かすれ」が増える
      if (crossRandom() > 0.5 + 0.46 * trust) {
        continue;
      }
      context.fillStyle = blendThread(
        palette.warpLow,
        palette.warpHigh,
        trust,
        warpShifts[column] + (crossRandom() - 0.5) * 6,
        0.34 + 0.24 * trust,
      );
      context.fillRect(
        column * cellWidth + (cellWidth - warpWidths[column]) / 2,
        row * cellHeight - cellHeight * 0.15,
        warpWidths[column],
        cellHeight * 1.3,
      );
    }
  }

  // 4. 織り止めの線（いま打ち込んでいる緯糸の位置）
  if (reveal < 1) {
    const edgeY = visibleRows * cellHeight;
    context.fillStyle = palette.shade;
    context.fillRect(0, edgeY, width, height - edgeY);
  }

  // 5. 紙のような粒を散らして，均一なCG感を和らげる
  const grainRandom = createRandom(65_537);
  context.fillStyle = palette.grain;
  const grainCount = Math.round((width * height) / 900);
  for (let index = 0; index < grainCount; index += 1) {
    const x = grainRandom() * width;
    const y = grainRandom() * height * reveal;
    context.fillRect(x, y, 1, 1);
  }
}

export function WeaveLoom() {
  const [credibility, setCredibility] = useState(88);
  const [freshness, setFreshness] = useState(94);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // 表示中の値（目標値へ向かって少しずつ動く）
  const shownRef = useRef({ credibility: 88, freshness: 94, reveal: 0 });
  const frameRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const startedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { theme } = useTheme();

  // 1フレーム描画する．必要なら次のフレームを予約する
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const { width, height } = sizeRef.current;
    if (!canvas || !context || width === 0) {
      return;
    }

    const shown = shownRef.current;
    const targetReveal = startedRef.current ? 1 : 0;
    if (prefersReducedMotion) {
      shown.credibility = credibility;
      shown.freshness = freshness;
      shown.reveal = targetReveal;
    } else {
      shown.credibility += (credibility - shown.credibility) * EASING_RATE;
      shown.freshness += (freshness - shown.freshness) * EASING_RATE;
      shown.reveal += (targetReveal - shown.reveal) * (EASING_RATE * 0.7);
      if (Math.abs(credibility - shown.credibility) < SNAP_THRESHOLD) shown.credibility = credibility;
      if (Math.abs(freshness - shown.freshness) < SNAP_THRESHOLD) shown.freshness = freshness;
      if (Math.abs(targetReveal - shown.reveal) < 0.004) shown.reveal = targetReveal;
    }

    const palette = theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
    drawCloth(context, width, height, shown.credibility, shown.freshness, shown.reveal, palette);

    const settled =
      shown.credibility === credibility &&
      shown.freshness === freshness &&
      shown.reveal === targetReveal;
    if (!settled) {
      frameRef.current = window.requestAnimationFrame(render);
    }
  }, [credibility, freshness, prefersReducedMotion, theme]);

  // 値・テーマが変わったら，描画ループを起こし直す
  useEffect(() => {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [render]);

  // 幅の変化に合わせてキャンバスの実解像度を取り直す
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) {
      return;
    }

    const resize = () => {
      const width = wrap.clientWidth;
      if (width === 0) {
        return;
      }
      const height = Math.round(width * CANVAS_RATIO);
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.height = `${height}px`;
      const context = canvas.getContext('2d');
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      sizeRef.current = { width, height };
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(render);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [render]);

  // 画面に入ってから織り始める（スクロールして初めて布が立ち上がる）
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || startedRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        startedRef.current = true;
        observer.disconnect();
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = window.requestAnimationFrame(render);
      },
      { threshold: 0.25 },
    );
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [render]);

  const activePreset = PRESETS.find(
    (preset) => preset.credibility === credibility && preset.freshness === freshness,
  );

  return (
    <div className={styles.weaveStage}>
      <div className={styles.weaveCanvasWrap} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={styles.weaveCanvas}
          role="img"
          aria-label={`信頼度${credibility}点，鮮度${freshness}点のときに生成される織り模様`}
        />
        <div className={styles.weaveEdge} aria-hidden="true" />
      </div>

      <div className={styles.weaveControls}>
        <div className={styles.weaveMeters}>
          <div>
            <span className={styles.meterLabel}>経 — 信頼度</span>
            <span className={styles.meterValue} style={{ color: 'var(--warp)' }}>
              {credibility}
              <small>点</small>
            </span>
          </div>
          <div>
            <span className={styles.meterLabel}>緯 — 鮮度</span>
            <span className={styles.meterValue} style={{ color: 'var(--weft)' }}>
              {freshness}
              <small>点</small>
            </span>
          </div>
        </div>

        <label className={`${styles.slider} ${styles.sliderWarp}`}>
          <span>信頼度（経糸の色と張り）</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={credibility}
            onChange={(event) => setCredibility(Number(event.target.value))}
            aria-label="信頼度のスコアを変えて織りの変化を見る"
          />
        </label>
        <label className={`${styles.slider} ${styles.sliderWeft}`}>
          <span>鮮度（緯糸の色と太さ）</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={freshness}
            onChange={(event) => setFreshness(Number(event.target.value))}
            aria-label="鮮度のスコアを変えて織りの変化を見る"
          />
        </label>

        <div className={styles.presetRow} role="group" aria-label="診断結果の例から選ぶ">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={activePreset?.label === preset.label}
              onClick={() => {
                setCredibility(preset.credibility);
                setFreshness(preset.freshness);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className={styles.weaveNote}>
          スライダーを動かすと，同じ記事でも布の表情が変わります．値が同じなら，いつも同じ一枚が織り上がります．
        </p>
      </div>
    </div>
  );
}

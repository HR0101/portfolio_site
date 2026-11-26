"use client";

import { useCallback, useEffect, useMemo, useRef, type PointerEvent } from 'react';
import { useCanvasLoop, type CanvasFrame } from '../hooks/useCanvasLoop';
import { useTheme } from '../hooks/useTheme';
import { projectTetra } from '../lib/aboutFigures';
import { getWorldLook } from '../lib/world/palette';
import { pushTetra, strokeSegments } from '../lib/world/tetraStroke';
import {
  approach,
  createSkillBurst,
  createSkillDrift,
  createSkillFieldLayout,
  findSkillNodeAt,
  getSkillBurstState,
  getSkillDriftPosition,
  getSkillNodeScale,
  getSkillParallax,
  SKILL_BURST_LIFE_MS,
  SKILL_BURST_SIZE,
  type SkillBurstParticle,
  type SkillNode,
} from '../lib/skillTetra';
import styles from './SkillExamples.module.css';

// 群れの色（世界の色の番号．0 学ぶ・1 アプリ・2 組込み・3 信頼）．
// Interface & Experience → アプリの紫，Data & System → 組込みの緑青，Everyday Tools → 学ぶの金
const GROUP_ACCENT_INDEX = [1, 2, 0] as const;
// 線の濃さ（選んでいない・近づけた・選んだ・押せない技術・漂う三角錐）
const ALPHA_IDLE = 0.45;
const ALPHA_HOVER = 0.8;
const ALPHA_SELECTED = 1;
const ALPHA_STATIC = 0.22;
const ALPHA_DRIFT = 0.16;
// 線の太さ（px）
const LINE_NODE = 1.2;
const LINE_SELECTED = 1.6;
const LINE_SMALL = 0.8;
// 回る速さ（ラジアン/ミリ秒）と，近づけたときの速さの倍率
const SPIN_SPEED = 0.0004;
const HOVER_SPIN_BOOST = 2.5;
// 縦の傾きの揺れ（中心・幅・速さ）
const PITCH_BASE = 0.55;
const PITCH_SWAY = 0.25;
const PITCH_SPEED = 0.0006;
// 選んだ三角錐の外側に重ねる，逆に回る大きな影の大きさの倍率と濃さ
const HALO_SCALE = 1.9;
const HALO_ALPHA = 0.22;
// 視差がカーソルへ寄る速さ（時定数．ミリ秒）
const PARALLAX_TAU_MS = 220;
// 技術名の文字（三角錐の下に描く）
const LABEL_FONT = '400 11px "SF Mono", ui-monospace, Menlo, monospace';
const LABEL_GAP = 14;
const LABEL_ALPHA = 0.9;
// 文字の周りの，線を消す余白（px）と高さ（px）
const LABEL_PADDING_X = 8;
const LABEL_PADDING_Y = 4;
const LABEL_HEIGHT = 20;
// はじける三角錐の濃さの段階（線引きの回数を抑えるため，3 段にまとめる）
const BURST_ALPHA_STEPS = [0.25, 0.55, 0.85] as const;

interface SkillGroup {
  title: string;
  technologies: readonly string[];
}

interface ActiveBurst {
  node: number;
  startMs: number;
  particles: SkillBurstParticle[];
}

interface SkillTetraFieldProps {
  groups: readonly SkillGroup[];
  // 使用例がある（押せる）技術
  selectable: ReadonlySet<string>;
  selected: string;
  onSelect: (technology: string) => void;
}

// 線の濃さの段階を，はじける三角錐の残りの濃さから選ぶ
function burstAlphaStep(alpha: number): number {
  return BURST_ALPHA_STEPS.reduce((best, step) => (Math.abs(step - alpha) < Math.abs(best - alpha) ? step : best), BURST_ALPHA_STEPS[0]);
}

// 「技術と，使った場面」の技術を，1 つずつ線の三角錐として浮かべる．押すと使用例が切り替わる．
// 操作の主役は下の技術ボタン（キーボード・読み上げ用）のままで，この面は aria-hidden の飾りを兼ねた入口．
// 出すのは PC のマウス・幅 1024px 以上・動きを減らさない設定のときだけ（CSS の .field で切り替える）．
export function SkillTetraField({ groups, selectable, selected, onSelect }: SkillTetraFieldProps) {
  const { theme } = useTheme();
  const technologies = useMemo(
    () => groups.flatMap((group, groupIndex) => group.technologies.map((technology) => ({ technology, group: groupIndex }))),
    [groups],
  );
  const groupSizes = useMemo(() => groups.map((group) => group.technologies.length), [groups]);
  const drift = useMemo(() => createSkillDrift(7), []);

  const layoutRef = useRef<{ width: number; height: number; nodes: SkillNode[] }>({ width: 0, height: 0, nodes: [] });
  // 視差を足した，いま描いている位置（当たり判定に使う）
  const positionsRef = useRef<Array<{ x: number; y: number; size: number }>>([]);
  const hoverAmountRef = useRef<number[]>([]);
  const selectedAmountRef = useRef<number[]>([]);
  const anglesRef = useRef<number[]>([]);
  const pressRef = useRef<number[]>([]);
  const burstsRef = useRef<ActiveBurst[]>([]);
  const burstSeedRef = useRef(1);
  const hoveredRef = useRef(-1);
  const pointerRef = useRef({ x: 0, y: 0, nx: 0, ny: 0, inside: false });
  const parallaxRef = useRef({ nx: 0, ny: 0 });
  const timeRef = useRef(0);
  const selectedRef = useRef(selected);
  const cornersRef = useRef<number[]>(new Array(8).fill(0));

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const draw = useCallback((context: CanvasRenderingContext2D, frame: CanvasFrame) => {
    const { width, height, timeMs, deltaMs } = frame;
    timeRef.current = timeMs;
    let layout = layoutRef.current;
    if (layout.width !== width || layout.height !== height) {
      layout = { width, height, nodes: createSkillFieldLayout(groupSizes, width, height) };
      layoutRef.current = layout;
      // 最初から選ばれている技術は，育つ途中を見せずに選んだ大きさで始める
      selectedAmountRef.current = layout.nodes.map((_, index) => (technologies[index]?.technology === selectedRef.current ? 1 : 0));
      hoverAmountRef.current = layout.nodes.map(() => 0);
      anglesRef.current = layout.nodes.map((node) => node.phase);
      pressRef.current = layout.nodes.map(() => Number.NEGATIVE_INFINITY);
    }
    const look = getWorldLook(theme);
    const corners = cornersRef.current;

    // 視差はカーソルへゆっくり寄せる（外へ出たら中央へ戻る）
    const pointer = pointerRef.current;
    const parallax = parallaxRef.current;
    parallax.nx = approach(parallax.nx, pointer.inside ? pointer.nx : 0, deltaMs, PARALLAX_TAU_MS);
    parallax.ny = approach(parallax.ny, pointer.inside ? pointer.ny : 0, deltaMs, PARALLAX_TAU_MS);

    // 漂う小さな三角錐（いちばん奥．墨色を淡く）
    const driftSegments: number[] = [];
    drift.forEach((particle, index) => {
      const position = getSkillDriftPosition(particle, timeMs, width, height);
      const shift = getSkillParallax(parallax.nx, parallax.ny, particle.depth * 0.6);
      projectTetra(particle.phase + timeMs * SPIN_SPEED * 0.6, PITCH_BASE + index * 0.07, corners);
      pushTetra(driftSegments, corners, position.x + shift.x, position.y + shift.y, particle.size);
    });
    strokeSegments(context, driftSegments, look.ink, ALPHA_DRIFT, LINE_SMALL);

    // 技術の三角錐（群れの色 × 濃さの段階ごとに 1 回の線引き）
    const buckets = new Map<string, { color: string; alpha: number; width: number; segments: number[] }>();
    const bucket = (color: string, alpha: number, lineWidth: number) => {
      const key = `${color}|${alpha}|${lineWidth}`;
      let entry = buckets.get(key);
      if (!entry) {
        entry = { color, alpha, width: lineWidth, segments: [] };
        buckets.set(key, entry);
      }
      return entry.segments;
    };
    const positions: Array<{ x: number; y: number; size: number }> = [];
    const labels: Array<{ text: string; x: number; y: number }> = [];
    layout.nodes.forEach((node, index) => {
      const item = technologies[index];
      if (!item) return;
      const isSelectable = selectable.has(item.technology);
      const isSelected = item.technology === selectedRef.current;
      const isHovered = hoveredRef.current === index;
      const hover = approach(hoverAmountRef.current[index] ?? 0, isHovered ? 1 : 0, deltaMs);
      const chosen = approach(selectedAmountRef.current[index] ?? 0, isSelected ? 1 : 0, deltaMs);
      hoverAmountRef.current[index] = hover;
      selectedAmountRef.current[index] = chosen;
      anglesRef.current[index] = (anglesRef.current[index] ?? node.phase) + deltaMs * SPIN_SPEED * (0.6 + node.depth * 0.6) * (1 + HOVER_SPIN_BOOST * hover);

      const shift = getSkillParallax(parallax.nx, parallax.ny, node.depth);
      const x = node.x + shift.x;
      const y = node.y + shift.y;
      const size = node.size * getSkillNodeScale(hover, chosen, timeMs - (pressRef.current[index] ?? Number.NEGATIVE_INFINITY));
      positions.push({ x, y, size: node.size });

      const accent = look.accents[GROUP_ACCENT_INDEX[item.group] ?? 0];
      const pitch = PITCH_BASE + Math.sin(timeMs * PITCH_SPEED + node.phase) * PITCH_SWAY;
      projectTetra(anglesRef.current[index], pitch, corners);
      if (!isSelectable) {
        pushTetra(bucket(look.ink, ALPHA_STATIC, LINE_NODE), corners, x, y, size);
        return;
      }
      const alpha = isSelected ? ALPHA_SELECTED : isHovered ? ALPHA_HOVER : ALPHA_IDLE;
      pushTetra(bucket(accent, alpha, isSelected ? LINE_SELECTED : LINE_NODE), corners, x, y, size);
      if (chosen > 0.05) {
        // 選んだ三角錐の外側に，逆へ回る大きな影を重ねる
        projectTetra(-anglesRef.current[index] * 0.6, pitch + 0.4, corners);
        pushTetra(bucket(accent, HALO_ALPHA, LINE_SMALL), corners, x, y, size * (1 + (HALO_SCALE - 1) * chosen));
      }
      if (isSelected || isHovered) labels.push({ text: item.technology, x, y: y + size * HALO_SCALE * 0.6 + LABEL_GAP });
    });
    positionsRef.current = positions;

    // 押したときにはじける小さな三角錐
    burstsRef.current = burstsRef.current.filter((burst) => timeMs - burst.startMs < SKILL_BURST_LIFE_MS);
    burstsRef.current.forEach((burst) => {
      const node = layout.nodes[burst.node];
      const item = technologies[burst.node];
      const position = positions[burst.node];
      if (!node || !item || !position) return;
      const accent = look.accents[GROUP_ACCENT_INDEX[item.group] ?? 0];
      burst.particles.forEach((particle) => {
        const state = getSkillBurstState(particle, timeMs - burst.startMs);
        if (!state) return;
        projectTetra(particle.spin * (timeMs - burst.startMs) * 0.001, PITCH_BASE, corners);
        pushTetra(bucket(accent, burstAlphaStep(state.alpha), LINE_SMALL), corners, position.x + state.dx, position.y + state.dy, node.size * SKILL_BURST_SIZE * state.scale);
      });
    });

    buckets.forEach((entry) => strokeSegments(context, entry.segments, entry.color, entry.alpha, entry.width));

    // 選んだ技術（と近づけた技術）の名前．下の線を文字の周りだけ消してから描き，重なっても読めるようにする
    // （描画面は透明なので，消したところにはページの背景がそのまま見える）
    if (labels.length > 0) {
      context.font = LABEL_FONT;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      labels.forEach((label) => {
        const textWidth = context.measureText(label.text).width;
        const half = textWidth / 2 + LABEL_PADDING_X;
        const x = Math.min(width - half, Math.max(half, label.x));
        const y = Math.min(height - LABEL_HEIGHT, label.y);
        context.globalCompositeOperation = 'destination-out';
        context.globalAlpha = 1;
        context.beginPath();
        context.roundRect(x - half, y - LABEL_PADDING_Y, half * 2, LABEL_HEIGHT, LABEL_HEIGHT / 2);
        context.fill();
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = LABEL_ALPHA;
        context.fillStyle = look.ink;
        context.fillText(label.text, x, y);
      });
    }
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
  }, [theme, technologies, groupSizes, selectable, drift]);

  const { canvasRef } = useCanvasLoop({ draw, maxFps: 60 });

  // カーソルの位置から，近づけている三角錐を決める（描画は次のフレームで追従する）
  const updatePointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointerRef.current = {
      x, y,
      nx: rect.width > 0 ? (x / rect.width) * 2 - 1 : 0,
      ny: rect.height > 0 ? (y / rect.height) * 2 - 1 : 0,
      inside: true,
    };
    const hovered = findSkillNodeAt(positionsRef.current, x, y, (index) => selectable.has(technologies[index]?.technology ?? ''));
    hoveredRef.current = hovered;
    event.currentTarget.style.cursor = hovered >= 0 ? 'pointer' : '';
    return hovered;
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== 'mouse') return;
    updatePointer(event);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLCanvasElement>) => {
    pointerRef.current = { ...pointerRef.current, inside: false };
    hoveredRef.current = -1;
    event.currentTarget.style.cursor = '';
  };

  // 押した三角錐を沈ませ，小さな三角錐をはじけさせて，使用例を切り替える
  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const index = updatePointer(event);
    const item = technologies[index];
    if (index < 0 || !item) return;
    pressRef.current[index] = timeRef.current;
    burstsRef.current.push({ node: index, startMs: timeRef.current, particles: createSkillBurst(burstSeedRef.current) });
    burstSeedRef.current += 1;
    onSelect(item.technology);
  };

  return (
    <div className={styles.field} aria-hidden="true" data-testid="skill-tetra-field">
      <canvas
        ref={canvasRef}
        className={styles.fieldCanvas}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}

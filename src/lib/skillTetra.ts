// Skills の「技術と，使った場面」の上に浮かべる，さわれる三角錐の群れの計算．
// 位置・当たり判定・押したときの弾み・はじける小さな三角錐・漂う三角錐を，画面に触れない純粋関数にまとめる．
// 他のファイルを import しない（テストは tests/skill-tetra.test.mjs）．

// 群れの列の幅の比と列の間（SkillExamples.module.css の .groups の grid-template-columns・gap とそろえる）
export const SKILL_FIELD_COLUMNS: readonly number[] = [1.2, 1.2, 0.7];
export const SKILL_FIELD_GAP = 24;
// 三角錐を置く縦の範囲（上下の端は，選んだ技術の名前を描く余白として空ける）
export const SKILL_FIELD_TOP = 0.2;
export const SKILL_FIELD_BOTTOM = 0.72;
// 1 つの群れの行数
export const SKILL_FIELD_ROWS = 2;
// 置き場所の揺らぎ（升目の大きさに対する割合）と，行ごとの左右のずらし（升目の幅に対する割合）
export const SKILL_FIELD_JITTER = 0.18;
export const SKILL_ROW_SHIFT = 0.15;
// 三角錐の大きさ（升目の短いほうの辺に対する割合）と，その上下限（px）
export const SKILL_TETRA_SIZE_RATIO = 0.3;
export const SKILL_TETRA_MIN_SIZE = 14;
export const SKILL_TETRA_MAX_SIZE = 30;
// 当たり判定の半径（三角錐の大きさに対する倍率）
export const SKILL_HIT_SCALE = 1.25;
// 近づけたとき・選んだときの大きさの増え方
export const SKILL_HOVER_GROWTH = 0.2;
export const SKILL_SELECTED_GROWTH = 0.32;
// 近づけた・選んだ状態へ寄っていく速さ（時定数．ミリ秒）
export const SKILL_EASE_TAU_MS = 90;
// 押したときの沈み込み（サイトの .press-effect と同じ .95・120ms）
export const SKILL_PRESS_SCALE = 0.95;
export const SKILL_PRESS_MS = 120;
// はじける小さな三角錐の数・寿命・速さ（px/秒）・大きさ（元の三角錐に対する割合）
export const SKILL_BURST_COUNT = 6;
export const SKILL_BURST_LIFE_MS = 560;
export const SKILL_BURST_SPEED = 150;
export const SKILL_BURST_SIZE = 0.32;
// 漂う小さな三角錐の数・大きさ（px）・揺れの幅（px）・周期（ミリ秒）
export const SKILL_DRIFT_COUNT = 72;
export const SKILL_DRIFT_MIN_SIZE = 2.5;
export const SKILL_DRIFT_MAX_SIZE = 5.5;
export const SKILL_DRIFT_SWAY = 14;
export const SKILL_DRIFT_PERIOD_MS = 9000;
// カーソルの位置で群れがずれる量の上限（px．奥行き 1 のとき）
export const SKILL_PARALLAX_PX = 8;

export interface SkillNode {
  // 群れの番号と，群れの中の番号
  group: number;
  index: number;
  // 中心（CSS ピクセル）と大きさ（中心から頂点までの距離．px）
  x: number;
  y: number;
  size: number;
  // 0（奥）〜1（手前）．視差と回る速さに使う
  depth: number;
  // 回り始めの角度（ラジアン）
  phase: number;
}

export interface SkillBurstParticle {
  angle: number;
  speed: number;
  spin: number;
}

export interface SkillDriftParticle {
  // 置き場所（描画面の大きさに対する 0〜1）
  x: number;
  y: number;
  size: number;
  depth: number;
  phase: number;
}

// 種から決まる擬似乱数（mulberry32）．0 以上 1 未満．同じ種なら同じ並びになる
export function createSkillRandom(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// 列の比と間から，各群れの左端と幅を求める（CSS の grid と同じ割り方）
export function getSkillColumns(width: number, columns: readonly number[] = SKILL_FIELD_COLUMNS, gap = SKILL_FIELD_GAP): Array<{ left: number; width: number }> {
  const total = columns.reduce((sum, value) => sum + value, 0);
  const free = Math.max(0, width - gap * Math.max(0, columns.length - 1));
  let left = 0;
  return columns.map((value) => {
    const columnWidth = total > 0 ? (free * value) / total : 0;
    const column = { left, width: columnWidth };
    left += columnWidth + gap;
    return column;
  });
}

// 群れごとの三角錐の数から，すべての三角錐の位置と大きさを決める（同じ入力なら必ず同じ配置）
export function createSkillFieldLayout(groupSizes: readonly number[], width: number, height: number, seed = 42): SkillNode[] {
  if (!(width > 0) || !(height > 0)) return [];
  const random = createSkillRandom(seed);
  const columns = getSkillColumns(width, SKILL_FIELD_COLUMNS.slice(0, groupSizes.length));
  const top = height * SKILL_FIELD_TOP;
  const bandHeight = height * (SKILL_FIELD_BOTTOM - SKILL_FIELD_TOP);
  const nodes: SkillNode[] = [];
  groupSizes.forEach((count, group) => {
    const column = columns[group];
    if (!column || count <= 0) return;
    const rows = Math.min(SKILL_FIELD_ROWS, count);
    const perRow = Math.ceil(count / rows);
    const cellWidth = column.width / perRow;
    const cellHeight = bandHeight / rows;
    const size = clamp(Math.min(cellWidth, cellHeight) * SKILL_TETRA_SIZE_RATIO, SKILL_TETRA_MIN_SIZE, SKILL_TETRA_MAX_SIZE);
    for (let index = 0; index < count; index += 1) {
      const row = index % rows;
      const slot = Math.floor(index / rows);
      // 行ごとに左右へ少しずらし，格子に見えないようにする
      const shift = perRow > 1 ? (row % 2 === 0 ? -SKILL_ROW_SHIFT : SKILL_ROW_SHIFT) : 0;
      const jitterX = (random() - 0.5) * 2 * SKILL_FIELD_JITTER * cellWidth;
      const jitterY = (random() - 0.5) * 2 * SKILL_FIELD_JITTER * cellHeight;
      const x = clamp(column.left + (slot + 0.5 + shift) * cellWidth + jitterX, column.left + size, column.left + column.width - size);
      const y = clamp(top + (row + 0.5) * cellHeight + jitterY, size, height - size);
      nodes.push({ group, index, x, y, size, depth: random(), phase: random() * Math.PI * 2 });
    }
  });
  return nodes;
}

// (x, y) にいちばん近い，押せる三角錐の番号（当たりの半径の外なら -1）
export function findSkillNodeAt(
  nodes: ReadonlyArray<{ x: number; y: number; size: number }>,
  x: number,
  y: number,
  selectable: (index: number) => boolean = () => true,
  hitScale = SKILL_HIT_SCALE,
): number {
  let found = -1;
  let best = Number.POSITIVE_INFINITY;
  nodes.forEach((node, index) => {
    if (!selectable(index)) return;
    const distance = Math.hypot(node.x - x, node.y - y);
    if (distance <= node.size * hitScale && distance < best) {
      best = distance;
      found = index;
    }
  });
  return found;
}

// current を target へ，時定数 tau で寄せる（フレームの間隔によらず同じ速さ）
export function approach(current: number, target: number, deltaMs: number, tauMs = SKILL_EASE_TAU_MS): number {
  if (!(deltaMs > 0) || !(tauMs > 0)) return deltaMs > 0 ? target : current;
  return target + (current - target) * Math.exp(-deltaMs / tauMs);
}

// 押してからの経過に応じた大きさの倍率（半分の時間で .95 まで沈み，残りで戻る）
export function getPressScale(elapsedMs: number): number {
  if (!(elapsedMs >= 0) || elapsedMs >= SKILL_PRESS_MS) return 1;
  const half = SKILL_PRESS_MS / 2;
  const depth = elapsedMs < half ? elapsedMs / half : (SKILL_PRESS_MS - elapsedMs) / half;
  return 1 - (1 - SKILL_PRESS_SCALE) * depth;
}

// 近づけた量・選んだ量・押した経過から，三角錐の大きさの倍率を求める
export function getSkillNodeScale(hover: number, selected: number, pressElapsedMs: number): number {
  return (1 + SKILL_HOVER_GROWTH * clamp(hover, 0, 1) + SKILL_SELECTED_GROWTH * clamp(selected, 0, 1)) * getPressScale(pressElapsedMs);
}

// はじける小さな三角錐（四方へ均等に，少しだけ揺らぐ）
export function createSkillBurst(seed: number, count = SKILL_BURST_COUNT): SkillBurstParticle[] {
  const random = createSkillRandom(seed);
  return Array.from({ length: count }, (_, index) => ({
    angle: (index / count) * Math.PI * 2 + (random() - 0.5) * 0.6,
    speed: SKILL_BURST_SPEED * (0.7 + random() * 0.6),
    spin: (random() - 0.5) * 8,
  }));
}

// はじけた小さな三角錐の，経過時間ごとの位置のずれ・濃さ・大きさの倍率（寿命を過ぎたら null）
export function getSkillBurstState(particle: SkillBurstParticle, elapsedMs: number): { dx: number; dy: number; alpha: number; scale: number } | null {
  if (!(elapsedMs >= 0) || elapsedMs >= SKILL_BURST_LIFE_MS) return null;
  const life = elapsedMs / SKILL_BURST_LIFE_MS;
  // 速さは減っていく（進む距離は 1-(1-t)^2 の形）
  const distance = (particle.speed * SKILL_BURST_LIFE_MS / 1000) * (1 - (1 - life) ** 2) * 0.5;
  return {
    dx: Math.cos(particle.angle) * distance,
    dy: Math.sin(particle.angle) * distance,
    alpha: 1 - life,
    scale: 1 - life * 0.5,
  };
}

// 漂う小さな三角錐（描画面の全体に散らす）
export function createSkillDrift(seed: number, count = SKILL_DRIFT_COUNT): SkillDriftParticle[] {
  const random = createSkillRandom(seed);
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    size: SKILL_DRIFT_MIN_SIZE + random() * (SKILL_DRIFT_MAX_SIZE - SKILL_DRIFT_MIN_SIZE),
    depth: random(),
    phase: random() * Math.PI * 2,
  }));
}

// 漂う三角錐の，時刻ごとの位置（CSS ピクセル．ゆっくり楕円を描いて揺れる）
export function getSkillDriftPosition(particle: SkillDriftParticle, timeMs: number, width: number, height: number): { x: number; y: number } {
  const angle = particle.phase + (timeMs / SKILL_DRIFT_PERIOD_MS) * Math.PI * 2 * (0.5 + particle.depth * 0.5);
  return {
    x: particle.x * width + Math.cos(angle) * SKILL_DRIFT_SWAY,
    y: particle.y * height + Math.sin(angle * 0.8) * SKILL_DRIFT_SWAY * 0.6,
  };
}

// カーソルの位置（描画面の中心からの -1〜1）による，奥行きごとのずれ（px）
export function getSkillParallax(nx: number, ny: number, depth: number): { x: number; y: number } {
  const sx = clamp(Number.isFinite(nx) ? nx : 0, -1, 1);
  const sy = clamp(Number.isFinite(ny) ? ny : 0, -1, 1);
  const amount = SKILL_PARALLAX_PX * (0.35 + clamp(depth, 0, 1) * 0.65);
  return { x: -sx * amount, y: -sy * amount };
}

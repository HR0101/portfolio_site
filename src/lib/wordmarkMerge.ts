// フッターの名前が，点描の惑星から現れる動きの計算（描画は particleWordmarkCanvas.ts）．
// 何もなかった場所に大きくなった惑星が，バラバラにほどけ，その点が名前の粒子の置かれている場所へ流れ込んで，文字が現れる．
// 名前の粒子 1 つ 1 つが，惑星の点のどれかから出てくる．動きの位置は進み具合（0〜1）だけで決まる純粋な計算なので，
// 戻せば文字は惑星の形へ戻る．
// 名前の粒子の，置かれている場所と，章の色の粒子（名前の「.」）か
export interface MergePoint {
  x: number;
  y: number;
  accent: boolean;
}

export interface MergeDot {
  // 惑星の点の番号（惑星の点群のうち，どの点か）
  source: number;
  // 流れ込む先（名前の粒子の位置）
  targetX: number;
  targetY: number;
  // 名前の「.」の粒子か（章の色で描く）．そうでなければ，名前の文字の粒子（墨色）
  accent: boolean;
  // 動き出す遅れ（0〜1），散る向き（ラジアン），向きが回る量（ラジアン），散る距離の割合（0〜1）
  delay: number;
  angle: number;
  swirl: number;
  reach: number;
}

export interface MergeState {
  x: number;
  y: number;
  // 0 = 惑星の見た目，1 = 名前の粒子の見た目（色・大きさを混ぜる割合）
  mix: number;
  // 現れ方（最初は惑星と重なって見えるので，少しずつ濃くする）
  alpha: number;
}

// 動き出しの遅れの幅（進み具合に対する割合）
const DELAY_SPAN = 0.35;
// 散る距離の最大（名前の高さに対する割合は，呼び出し側が掛ける）
const REACH_MAX = 1;
// 現れ始めの濃さの立ち上がり（進み具合）
const FADE_IN = 0.12;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const easeInOutCubic = (value: number) => (value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2);

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// 名前の粒子 1 つ 1 つが，惑星の点のどれから出てくるかを決める．同じ入力なら同じ割り当てになる．
// 名前の粒子は惑星の点より多いので，同じ点から何粒も出てくる（惑星がバラバラに砕けて見える）
export function createMergePlan(sourceCount: number, targets: readonly MergePoint[], seed = 7): MergeDot[] {
  const random = createRandom(seed);
  const dots: MergeDot[] = [];
  if (sourceCount < 1) return dots;
  for (const target of targets) {
    dots.push({
      source: Math.min(sourceCount - 1, Math.floor(random() * sourceCount)),
      targetX: target.x,
      targetY: target.y,
      accent: target.accent,
      delay: random(),
      angle: random() * Math.PI * 2,
      swirl: (random() - 0.5) * 4,
      reach: random() * REACH_MAX,
    });
  }
  return dots;
}

// 点 1 つの，進み具合（0〜1）での位置と見た目．start は，いまの惑星の上での，その点の位置．
// spread は，散る距離の基準（px）．out に書き込むので，毎フレームの割り当てが起きない
export function evaluateMergeDot(dot: MergeDot, startX: number, startY: number, progress: number, spread: number, out: MergeState) {
  const local = clamp((progress - dot.delay * DELAY_SPAN) / (1 - DELAY_SPAN));
  const travel = easeInOutCubic(local);
  const bell = Math.sin(Math.PI * local);
  const heading = dot.angle + dot.swirl * local;
  out.x = startX + (dot.targetX - startX) * travel + Math.cos(heading) * dot.reach * spread * bell;
  out.y = startY + (dot.targetY - startY) * travel + Math.sin(heading) * dot.reach * spread * bell;
  out.mix = smoothstep(clamp(local * 1.6));
  out.alpha = clamp(progress / FADE_IN);
}

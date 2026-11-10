// 分解ビュー（実画面を Z 方向の層へ離す）の計算．画面に触れない純粋な関数だけを置く．
// 他のファイルを読み込まない（テストが TS をそのまま読み込めるようにするため）．

// 層の数（0 背面の板／1 実画面／2 見どころの枠と番号／3 格子と引き出し線）
export const EXPLODED_LAYER_COUNT = 4;
// 実画面の層の番号と，その影が落ちる背面の板の番号
export const EXPLODED_SCREEN_LAYER = 1;
export const EXPLODED_BACK_LAYER = 0;
// 層の間隔（px）：画面の幅の 9% を，28〜56px に収める
export const EXPLODED_GAP_WIDTH_RATIO = 0.09;
export const EXPLODED_GAP_MIN_PX = 28;
export const EXPLODED_GAP_MAX_PX = 56;
// 分解し切ったときの傾き（度）．X は 14 度，Y は −22 度
export const EXPLODED_TILT_X_DEG = 14;
export const EXPLODED_TILT_Y_DEG = 22;
// カーソルに追う傾きの大きさ（度）：止まっているときは 4 度，分解し切ると 8 度
export const POINTER_TILT_BASE_DEG = 4;
export const POINTER_TILT_EXTRA_DEG = 4;
// 傾けて奥行きを付けると媒体欄の外へはみ出すので，分解の進みに応じて全体を縮める割合
export const EXPLODED_FIT_SHRINK = 0.16;
// 光の向き（画面の左上手前）と見る向き．鏡面反射の半角ベクトルの計算に使う
export const EXPLODED_LIGHT: readonly [number, number, number] = [-0.4, -0.6, 0.7];
export const EXPLODED_VIEW_DIRECTION: readonly [number, number, number] = [0, 0, 1];
export const SPECULAR_EXPONENT = 24;
export const GLARE_MAX_OPACITY = 0.28;
// 影：もともとの実画面の影（3px 5px・不透明度 0.22）と同じ値から始め，離れるほど遠く，薄くする
export const SHADOW_BASE_OFFSET_PX = { x: 3, y: 5 } as const;
export const SHADOW_OFFSET_FACTOR = 0.35;
export const SHADOW_BASE_OPACITY = 0.22;
export const SHADOW_FADE_RATIO = 0.4;
// 層が現れる進みの範囲（背面の板は 0〜板の幅，枠と格子は少し遅れて 0.05 から）
export const BACK_PLATE_FADE_SPAN = 0.3;
export const OVERLAY_FADE_START = 0.05;
export const OVERLAY_FADE_SPAN = 0.3;
// ばねの応答時間（秒）．進みは 0.4，カーソルへの追従は 0.25（どちらも臨界減衰）
export const EXPLODED_RESPONSE_SEC = 0.4;
export const EXPLODED_POINTER_RESPONSE_SEC = 0.25;

const DEGREES_TO_RADIANS = Math.PI / 180;

export interface ExplodedPoseInput {
  // 進み（0 = 重なっている，1 = 分解し切った）
  progress: number;
  // カーソルの位置（−1〜1．画面の中心が 0）
  pointerX: number;
  pointerY: number;
  // 画面の幅（px）
  width: number;
  layerCount?: number;
}

export interface ExplodedLayerPose {
  index: number;
  // 奥行き（px．手前が正）
  z: number;
  opacity: number;
}

export interface ExplodedPose {
  gap: number;
  // 全体の傾き（度）
  rotX: number;
  rotY: number;
  // 全体を縮める倍率
  scale: number;
  layers: ExplodedLayerPose[];
  // 鏡面反射の不透明度（0〜0.28）
  glare: number;
  shadow: { x: number; y: number; opacity: number };
}

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const clampUnit = (value: number) => clamp(finiteOr(value, 0), 0, 1);

const normalize = (vector: readonly [number, number, number]): [number, number, number] => {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
};

// 層の間隔：画面の幅に比例し，28〜56px に収める
export function getExplodedGap(width: number): number {
  return clamp(finiteOr(width, 0) * EXPLODED_GAP_WIDTH_RATIO, EXPLODED_GAP_MIN_PX, EXPLODED_GAP_MAX_PX);
}

// 面の向き N = Ry(rotY)·Rx(rotX)·(0,0,1) と，半角ベクトル H = normalize(L + V) の内積を 24 乗して，鏡面反射の強さ（0〜1）を求める
export function getSpecularIntensity(rotXDeg: number, rotYDeg: number): number {
  const rotX = finiteOr(rotXDeg, 0) * DEGREES_TO_RADIANS;
  const rotY = finiteOr(rotYDeg, 0) * DEGREES_TO_RADIANS;
  const normal: [number, number, number] = [
    Math.cos(rotX) * Math.sin(rotY),
    -Math.sin(rotX),
    Math.cos(rotX) * Math.cos(rotY),
  ];
  const light = normalize(EXPLODED_LIGHT);
  const half = normalize([
    light[0] + EXPLODED_VIEW_DIRECTION[0],
    light[1] + EXPLODED_VIEW_DIRECTION[1],
    light[2] + EXPLODED_VIEW_DIRECTION[2],
  ]);
  const dot = normal[0] * half[0] + normal[1] * half[1] + normal[2] * half[2];
  return Math.pow(Math.max(0, dot), SPECULAR_EXPONENT);
}

// 層ごとの不透明度：背面の板は進みに合わせて現れ，実画面は常に 1，枠と格子は少し遅れて現れる（現れる前は 0）
function getLayerOpacity(index: number, progress: number): number {
  if (index === EXPLODED_SCREEN_LAYER) return 1;
  if (index === EXPLODED_BACK_LAYER) return clampUnit(progress / BACK_PLATE_FADE_SPAN);
  return clampUnit((progress - OVERLAY_FADE_START) / OVERLAY_FADE_SPAN);
}

// 進み・カーソル・画面の幅から，全体の傾き・各層の奥行き・鏡面反射・影をまとめて求める
export function getExplodedPose(input: ExplodedPoseInput): ExplodedPose {
  const progress = clampUnit(input.progress);
  const pointerX = clamp(finiteOr(input.pointerX, 0), -1, 1);
  const pointerY = clamp(finiteOr(input.pointerY, 0), -1, 1);
  const count = Math.max(1, Math.floor(finiteOr(input.layerCount ?? EXPLODED_LAYER_COUNT, EXPLODED_LAYER_COUNT)));
  const gap = getExplodedGap(input.width);
  const center = (count - 1) / 2;
  // 奥行きは中央の層を 0 にして，手前と奥へ対称に離す（合計は 0）
  const layers: ExplodedLayerPose[] = Array.from({ length: count }, (_, index) => ({
    index,
    // + 0 で，進みが 0 のときの -0 を 0 にそろえる
    z: progress * (index - center) * gap + 0,
    opacity: getLayerOpacity(index, progress),
  }));
  const tilt = POINTER_TILT_BASE_DEG + POINTER_TILT_EXTRA_DEG * progress;
  const rotX = progress * EXPLODED_TILT_X_DEG - pointerY * tilt;
  const rotY = -progress * EXPLODED_TILT_Y_DEG + pointerX * tilt;

  // 影は，実画面の層が背面の板から浮いている高さに比例して，光と反対の向き（右下）へずれる
  const screenZ = layers[Math.min(EXPLODED_SCREEN_LAYER, count - 1)].z;
  const backZ = layers[Math.min(EXPLODED_BACK_LAYER, count - 1)].z;
  const lift = Math.max(0, screenZ - backZ);
  const light = normalize(EXPLODED_LIGHT);
  return {
    gap,
    rotX,
    rotY,
    scale: 1 - EXPLODED_FIT_SHRINK * progress,
    layers,
    glare: GLARE_MAX_OPACITY * getSpecularIntensity(rotX, rotY),
    shadow: {
      x: SHADOW_BASE_OFFSET_PX.x - light[0] * lift * SHADOW_OFFSET_FACTOR,
      y: SHADOW_BASE_OFFSET_PX.y - light[1] * lift * SHADOW_OFFSET_FACTOR,
      opacity: SHADOW_BASE_OPACITY * (1 - SHADOW_FADE_RATIO * progress),
    },
  };
}

// ===== 引き出し線つきのラベルの配置（層 3） =====

// ラベルの箱の大きさ（px）と，画面の端・画像との間隔
export const CALLOUT_MIN_WIDTH_PX = 44;
export const CALLOUT_MAX_WIDTH_PX = 92;
export const CALLOUT_HEIGHT_PX = 46;
export const CALLOUT_GAP_PX = 6;
export const CALLOUT_EDGE_MARGIN_PX = 4;
export const CALLOUT_STACK_SPACING_PX = 4;

export interface CalloutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CalloutInput {
  id: string;
  // 画像に対する 0〜1 の割合
  region: CalloutRect;
}

export interface CalloutPlacement {
  id: string;
  side: 'left' | 'right';
  // 引き出し線の始点（領域の枠の，ラベル側の縁の中央）
  anchorX: number;
  anchorY: number;
  // ラベルの箱（左上の座標と大きさ）
  chipX: number;
  chipY: number;
  chipWidth: number;
  chipHeight: number;
  // 引き出し線の終点（ラベルの内側の縁の中央）
  tipX: number;
  tipY: number;
}

interface PlacementDraft {
  position: number;
  side: 'left' | 'right';
  centerY: number;
  anchorX: number;
  anchorY: number;
}

// 見どころの領域ごとに，近いほうの側（画像の左か右の余白）へラベルを置き，引き出し線の両端を求める．
// 同じ側のラベルは縦に重ならないよう押し下げ，枠からはみ出す分は引き上げる（座標は枠の左上が原点）
export function getCalloutPlacements(image: CalloutRect, frame: CalloutRect, regions: CalloutInput[]): CalloutPlacement[] {
  if (![image, frame].every(rect => [rect.x, rect.y, rect.w, rect.h].every(Number.isFinite)) || image.w <= 0 || image.h <= 0 || frame.w <= 0 || frame.h <= 0) {
    return [];
  }
  const leftSpace = image.x - frame.x - CALLOUT_EDGE_MARGIN_PX - CALLOUT_GAP_PX;
  const rightSpace = frame.x + frame.w - (image.x + image.w) - CALLOUT_EDGE_MARGIN_PX - CALLOUT_GAP_PX;
  const leftWidth = clamp(leftSpace, CALLOUT_MIN_WIDTH_PX, CALLOUT_MAX_WIDTH_PX);
  const rightWidth = clamp(rightSpace, CALLOUT_MIN_WIDTH_PX, CALLOUT_MAX_WIDTH_PX);

  const drafts: PlacementDraft[] = regions.map((item, position) => {
    const left = image.x + image.w * clampUnit(item.region.x);
    const right = left + image.w * clampUnit(item.region.w);
    const top = image.y + image.h * clampUnit(item.region.y);
    const centerY = top + (image.h * clampUnit(item.region.h)) / 2;
    const distanceLeft = clampUnit(item.region.x);
    const distanceRight = 1 - clampUnit(item.region.x + item.region.w);
    const side = distanceRight <= distanceLeft ? 'right' : 'left';
    return { position, side, centerY, anchorX: side === 'left' ? left : right, anchorY: centerY };
  });

  const topLimit = frame.y + CALLOUT_EDGE_MARGIN_PX;
  const bottomLimit = frame.y + frame.h - CALLOUT_EDGE_MARGIN_PX - CALLOUT_HEIGHT_PX;
  const step = CALLOUT_HEIGHT_PX + CALLOUT_STACK_SPACING_PX;
  const chipTops = new Map<number, number>();
  for (const side of ['left', 'right'] as const) {
    const column = drafts.filter(draft => draft.side === side).sort((a, b) => a.centerY - b.centerY);
    const tops = column.map(draft => clamp(draft.centerY - CALLOUT_HEIGHT_PX / 2, topLimit, Math.max(topLimit, bottomLimit)));
    // 上から順に，前のラベルの下へ押し下げる
    for (let index = 1; index < tops.length; index++) tops[index] = Math.max(tops[index], tops[index - 1] + step);
    // 下の端を超えた分は，下から順に引き上げる
    for (let index = tops.length - 1; index >= 0; index--) {
      const limit = index === tops.length - 1 ? bottomLimit : tops[index + 1] - step;
      tops[index] = Math.min(tops[index], limit);
    }
    column.forEach((draft, index) => chipTops.set(draft.position, tops[index]));
  }

  return drafts.map(draft => {
    const chipWidth = draft.side === 'left' ? leftWidth : rightWidth;
    const chipX = draft.side === 'left'
      ? Math.max(frame.x + CALLOUT_EDGE_MARGIN_PX, image.x - CALLOUT_GAP_PX - chipWidth)
      : Math.min(frame.x + frame.w - CALLOUT_EDGE_MARGIN_PX - chipWidth, image.x + image.w + CALLOUT_GAP_PX);
    const chipY = chipTops.get(draft.position) ?? draft.centerY - CALLOUT_HEIGHT_PX / 2;
    return {
      id: regions[draft.position].id,
      side: draft.side,
      anchorX: draft.anchorX,
      anchorY: draft.anchorY,
      chipX,
      chipY,
      chipWidth,
      chipHeight: CALLOUT_HEIGHT_PX,
      tipX: draft.side === 'left' ? chipX + chipWidth : chipX,
      tipY: chipY + CALLOUT_HEIGHT_PX / 2,
    };
  });
}

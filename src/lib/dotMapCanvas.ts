import {
  WORLD_DOT_BITS,
  WORLD_DOT_COLUMNS,
  WORLD_DOT_LATITUDE_BOTTOM,
  WORLD_DOT_LATITUDE_TOP,
  WORLD_DOT_ROWS,
} from './worldDotMap';

// 読み込み画面の，ドットの世界地図を Canvas に描く．
// 進捗に合わせて左から現れ，点がランダムに瞬き，日本の陸地だけが青く光る．

const FULL_PERCENT = 100;
const FULL_LONGITUDE = 360;
const LONGITUDE_LEFT = -180;
// 東京の位置．波紋の中心にする
const TOKYO_LONGITUDE = 139.69;
const TOKYO_LATITUDE = 35.68;
// 日本として青く光らせる範囲
const JAPAN_LONGITUDE_MIN = 128.5;
const JAPAN_LONGITUDE_MAX = 146.5;
const JAPAN_LATITUDE_MIN = 30.5;
const JAPAN_LATITUDE_MAX = 45.8;

// ドットの大きさ（1 マスの幅に対する半径の割合）
const DOT_RADIUS_RATIO = 0.28;
// 日本のドットは少し大きくする
const JAPAN_DOT_SCALE = 1.4;
// 通常のドットの濃さ
const DOT_BASE_ALPHA = 0.2;
// 地図が左から現れるときの帯の幅（マス）
const REVEAL_BAND_COLUMNS = 14;
// 日本が光り始める進捗（%）．地図が現れ終わるころ
const JAPAN_LIGHT_PROGRESS = 84;
// 瞬く点：1 秒あたりに生まれる数，同時に光る上限，光っている時間の幅（ms），最大の濃さ
const BLINKS_PER_SECOND = 22;
const BLINK_MAX_COUNT = 30;
const BLINK_MIN_MS = 260;
const BLINK_SPAN_MS = 380;
const BLINK_PEAK_ALPHA = 0.85;
const BLINK_DOT_SCALE = 1.3;
// 東京の波紋：1 周期（ms），最大の半径（マス），線の太さ（px）
const RIPPLE_PERIOD_MS = 1600;
const RIPPLE_MAX_CELLS = 5;
const RIPPLE_LINE_WIDTH = 1;
// 描画ピクセルの倍率の上限（重くなりすぎないように）
const MAX_PIXEL_RATIO = 2;

const DEFAULT_INK_COLOR = '#1d1d1f';
const DEFAULT_ACCENT_COLOR = '#396da9';

interface LandDot {
  column: number;
  x: number;
  y: number;
  isJapan: boolean;
}

interface Blink {
  dot: LandDot;
  bornAt: number;
  lifeMs: number;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

// 経緯度から，地図（0〜1 の割合）の位置へ
function projectToMap(longitude: number, latitude: number): { x: number; y: number } {
  return {
    x: (longitude - LONGITUDE_LEFT) / FULL_LONGITUDE,
    y: (WORLD_DOT_LATITUDE_TOP - latitude) / (WORLD_DOT_LATITUDE_TOP - WORLD_DOT_LATITUDE_BOTTOM),
  };
}

// base64 の陸地データを，陸地のマスの一覧へ戻す（x，y は 0〜1 の割合）
function decodeLandDots(): LandDot[] {
  const binary = atob(WORLD_DOT_BITS);
  const dots: LandDot[] = [];
  const longitudePerColumn = FULL_LONGITUDE / WORLD_DOT_COLUMNS;
  const latitudePerRow = (WORLD_DOT_LATITUDE_TOP - WORLD_DOT_LATITUDE_BOTTOM) / WORLD_DOT_ROWS;
  for (let row = 0; row < WORLD_DOT_ROWS; row++) {
    for (let column = 0; column < WORLD_DOT_COLUMNS; column++) {
      const bitIndex = row * WORLD_DOT_COLUMNS + column;
      const isLand = (binary.charCodeAt(bitIndex >> 3) >> (7 - (bitIndex & 7))) & 1;
      if (!isLand) {
        continue;
      }
      const longitude = LONGITUDE_LEFT + (column + 0.5) * longitudePerColumn;
      const latitude = WORLD_DOT_LATITUDE_TOP - (row + 0.5) * latitudePerRow;
      dots.push({
        column,
        x: (column + 0.5) / WORLD_DOT_COLUMNS,
        y: (row + 0.5) / WORLD_DOT_ROWS,
        isJapan:
          longitude >= JAPAN_LONGITUDE_MIN
          && longitude <= JAPAN_LONGITUDE_MAX
          && latitude >= JAPAN_LATITUDE_MIN
          && latitude <= JAPAN_LATITUDE_MAX,
      });
    }
  }
  return dots;
}

// CSS 変数の値を読む．スタイルシートがまだ読み込まれていないと空になるので，その場合は null
function readColor(name: string): string | null {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || null;
}

export interface DotMap {
  // 表示サイズが変わったとき（リサイズ時）に呼ぶ
  resize: () => void;
  // 進捗（0〜100）と現在時刻（ms）で，1 フレーム描く
  draw: (progress: number, now: number) => void;
}

// canvas に描くドットの地図を作る．色はサイトのトークン（--site-ink / --site-accent）に合わせる．
// 描けない環境（2D コンテキストが取れない）では null を返す
export function createDotMap(canvas: HTMLCanvasElement): DotMap | null {
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const dots = decodeLandDots();
  // 色はサイトのトークンから読む．開発サーバーなどで作成時にまだ読めないことがあるので，
  // 読めるまでは既定値で描き，読めた時点で固定する（ライト・ダークの切り替えにも合う）
  let inkColor = DEFAULT_INK_COLOR;
  let accentColor = DEFAULT_ACCENT_COLOR;
  let hasReadColors = false;
  const readColors = () => {
    const ink = readColor('--site-ink');
    const accent = readColor('--site-accent');
    if (ink && accent) {
      inkColor = ink;
      accentColor = accent;
      hasReadColors = true;
    }
  };
  const tokyo = projectToMap(TOKYO_LONGITUDE, TOKYO_LATITUDE);
  const blinks: Blink[] = [];
  let width = 0;
  let height = 0;
  let previousNow = 0;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const fillDot = (dot: LandDot, radius: number, color: string, alpha: number) => {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.beginPath();
    context.arc(dot.x * width, dot.y * height, radius, 0, Math.PI * 2);
    context.fill();
  };

  const draw = (progress: number, now: number) => {
    if (width === 0 || height === 0) {
      return;
    }
    if (!hasReadColors) {
      readColors();
    }
    const elapsed = previousNow ? Math.min(now - previousNow, 50) : 16.7;
    previousNow = now;
    context.clearRect(0, 0, width, height);

    const cellWidth = width / WORLD_DOT_COLUMNS;
    const radius = cellWidth * DOT_RADIUS_RATIO;
    // 進捗に合わせて，左から右へ現れる帯．帯の手前ほど濃い
    const revealEdge = (progress / FULL_PERCENT) * (WORLD_DOT_COLUMNS + REVEAL_BAND_COLUMNS);
    const isJapanLit = progress >= JAPAN_LIGHT_PROGRESS;

    dots.forEach((dot) => {
      const reveal = clampNumber((revealEdge - dot.column) / REVEAL_BAND_COLUMNS, 0, 1);
      if (reveal === 0) {
        return;
      }
      if (dot.isJapan && isJapanLit) {
        fillDot(dot, radius * JAPAN_DOT_SCALE, accentColor, reveal);
      } else {
        fillDot(dot, radius, inkColor, DOT_BASE_ALPHA * reveal);
      }
    });

    // 瞬く点：現れ終えた陸地の点を，ランダムに短く光らせる
    const revealedDots = dots.filter((dot) => dot.column < revealEdge - REVEAL_BAND_COLUMNS && !dot.isJapan);
    const spawnCount = (BLINKS_PER_SECOND * elapsed) / 1000;
    if (revealedDots.length > 0 && blinks.length < BLINK_MAX_COUNT && Math.random() < spawnCount) {
      blinks.push({
        dot: revealedDots[Math.floor(Math.random() * revealedDots.length)],
        bornAt: now,
        lifeMs: BLINK_MIN_MS + Math.random() * BLINK_SPAN_MS,
      });
    }
    for (let index = blinks.length - 1; index >= 0; index--) {
      const blink = blinks[index];
      const age = (now - blink.bornAt) / blink.lifeMs;
      if (age >= 1) {
        blinks.splice(index, 1);
        continue;
      }
      fillDot(blink.dot, radius * BLINK_DOT_SCALE, inkColor, BLINK_PEAK_ALPHA * Math.sin(Math.PI * age));
    }

    // 東京の波紋：日本が光ってから，ゆっくり広がっては消える
    if (isJapanLit) {
      const phase = (now % RIPPLE_PERIOD_MS) / RIPPLE_PERIOD_MS;
      context.globalAlpha = (1 - phase) * 0.8;
      context.strokeStyle = accentColor;
      context.lineWidth = RIPPLE_LINE_WIDTH;
      context.beginPath();
      context.arc(tokyo.x * width, tokyo.y * height, cellWidth * (1 + phase * RIPPLE_MAX_CELLS), 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  };

  resize();
  return { resize, draw };
}

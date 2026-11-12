/**
 * 読み込み画面のドットの世界地図（src/lib/worldDotMap.ts）を作るスクリプト．
 *
 * 使い方:
 *   curl -sSL -o land-110m.json https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json
 *   node scripts/generate-world-dots.mjs land-110m.json > src/lib/worldDotMap.ts
 *
 * 出典: Natural Earth 1:110m land（パブリックドメイン）．
 *       world-atlas@2.0.2（ISC ライセンス）の land-110m.json（TopoJSON）を入力に使う．
 * 地図は正距円筒図法で，1 マスを 2.4° 四方にして，陸地が一定以上かかるマスを 1 にする．
 */

import { readFileSync } from 'node:fs';

// マスの数と，緯度の範囲（南極は含めない）．1 マスは 360 / COLUMNS = 2.4°，(TOP - BOTTOM) / ROWS = 2.4°
const COLUMNS = 150;
const ROWS = 60;
const LATITUDE_TOP = 84;
const LATITUDE_BOTTOM = -60;
// 1 マスの中を縦横この数に分けて調べ，陸地にかかる割合で決める（小さな島や日本列島を残すため）
const SUPERSAMPLE = 4;
const LAND_COVERAGE_THRESHOLD = 0.25;

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('使い方: node scripts/generate-world-dots.mjs <land-110m.json>');
  process.exit(1);
}

// TopoJSON の弧（差分で並んでいる）を経緯度の座標へ戻す
function decodeArcs(topology) {
  const [scaleX, scaleY] = topology.transform.scale;
  const [translateX, translateY] = topology.transform.translate;
  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([deltaX, deltaY]) => {
      x += deltaX;
      y += deltaY;
      return [x * scaleX + translateX, y * scaleY + translateY];
    });
  });
}

// 弧の番号の並び（負の値は逆向き）から，1 つの輪の座標列を作る
function buildRing(arcIndexes, arcs) {
  const coordinates = [];
  arcIndexes.forEach((arcIndex) => {
    const arc = arcIndex >= 0 ? arcs[arcIndex] : [...arcs[~arcIndex]].reverse();
    coordinates.push(...(coordinates.length > 0 ? arc.slice(1) : arc));
  });
  return coordinates;
}

// 日付変更線をまたぐ輪（フィジーやユーラシアの東端）は，経度が -180 と 180 の間で飛ぶ．
// そのまま判定すると地球を一周する帯になるので，隣り合う点の経度の差が 180° を超えないよう
// 360° ずつずらして，連続した輪にそろえる（点の判定は経度を ±360° ずらしても行う）
function unwrapRing(ring) {
  const unwrapped = [ring[0].slice()];
  for (let i = 1; i < ring.length; i++) {
    let [x, y] = ring[i];
    const previousX = unwrapped[i - 1][0];
    while (x - previousX > 180) x -= 360;
    while (x - previousX < -180) x += 360;
    unwrapped.push([x, y]);
  }
  return unwrapped;
}

// 点が輪の内側にあるか（偶奇規則）
function isInsideRing(longitude, latitude, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > latitude !== yj > latitude
      && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

const topology = JSON.parse(readFileSync(inputPath, 'utf8'));
const arcs = decodeArcs(topology);
const polygons = [];
topology.objects.land.geometries.forEach((geometry) => {
  const multiPolygons = geometry.type === 'MultiPolygon' ? geometry.arcs : [geometry.arcs];
  multiPolygons.forEach((polygon) => {
    const rings = polygon.map((ring) => unwrapRing(buildRing(ring, arcs)));
    // 地図の範囲より南（南極大陸）は使わない．極を含む輪は平面では判定できない
    const northmostLatitude = Math.max(...rings.flat().map(([, y]) => y));
    if (northmostLatitude < LATITUDE_BOTTOM) return;
    polygons.push(rings);
  });
});

// 点が陸地か（輪の穴は偶奇規則で自然に抜ける．経度を ±360° ずらした位置も調べる）
const LONGITUDE_SHIFTS = [-360, 0, 360];
function isLand(longitude, latitude) {
  return polygons.some((rings) =>
    LONGITUDE_SHIFTS.some(
      (shift) => rings.filter((ring) => isInsideRing(longitude + shift, latitude, ring)).length % 2 === 1,
    ),
  );
}

const cellDegrees = 360 / COLUMNS;
const bits = [];
const preview = [];
for (let row = 0; row < ROWS; row++) {
  let line = '';
  for (let column = 0; column < COLUMNS; column++) {
    let landSamples = 0;
    for (let sy = 0; sy < SUPERSAMPLE; sy++) {
      for (let sx = 0; sx < SUPERSAMPLE; sx++) {
        const longitude = -180 + (column + (sx + 0.5) / SUPERSAMPLE) * cellDegrees;
        const latitude = LATITUDE_TOP - (row + (sy + 0.5) / SUPERSAMPLE) * cellDegrees;
        if (isLand(longitude, latitude)) landSamples++;
      }
    }
    const isLandCell = landSamples / (SUPERSAMPLE * SUPERSAMPLE) >= LAND_COVERAGE_THRESHOLD;
    bits.push(isLandCell ? 1 : 0);
    line += isLandCell ? '#' : '.';
  }
  preview.push(line);
}

// 8 ビットずつ（左が上位）まとめて base64 にする
const bytes = [];
for (let i = 0; i < bits.length; i += 8) {
  let value = 0;
  for (let b = 0; b < 8; b++) value = (value << 1) | (bits[i + b] ?? 0);
  bytes.push(value);
}
const base64 = Buffer.from(bytes).toString('base64');

console.error(preview.join('\n'));
console.error(`陸地のマス: ${bits.filter(Boolean).length} / ${bits.length}`);

console.log(`// 自動生成: scripts/generate-world-dots.mjs（手で編集しない）
// 出典: Natural Earth 1:110m land（パブリックドメイン）．
//       world-atlas@2.0.2（ISC ライセンス）の land-110m.json から作成した，ドットの世界地図．

// マスの数（横・縦）．1 マスは 2.4° 四方の正距円筒図法
export const WORLD_DOT_COLUMNS = ${COLUMNS};
export const WORLD_DOT_ROWS = ${ROWS};
// 地図の上端と下端の緯度（南極は含めない）
export const WORLD_DOT_LATITUDE_TOP = ${LATITUDE_TOP};
export const WORLD_DOT_LATITUDE_BOTTOM = ${LATITUDE_BOTTOM};
// 陸地のマスを 1 として，左上から右へ・上から下へ並べ，8 ビットずつ base64 にしたもの
export const WORLD_DOT_BITS = '${base64}';
`);

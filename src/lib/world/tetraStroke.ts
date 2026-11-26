// 3D ワイヤーフレーム粒子を Canvas に描く共通の部品．自己紹介・章の立体・章の間の帯が同じ描き方を使う．
// 線分は配列にためて，色 × 濃さ × 太さごとに 1 回の線引きでまとめて描く（粒子数だけ stroke を呼ばない）．
import { TETRA_EDGES } from '../aboutFigures';

// 任意の 3D 多面体 1 つの辺集合を，線分の配列（x1, y1, x2, y2 の並び）へ足す（corners は projectParticleShape / projectTetra の結果）
export function pushPolyhedron(
  segments: number[],
  corners: readonly number[],
  edges: ReadonlyArray<readonly [number, number]>,
  x: number,
  y: number,
  size: number,
) {
  for (const [from, to] of edges) {
    segments.push(
      x + corners[from * 2] * size,
      y + corners[from * 2 + 1] * size,
      x + corners[to * 2] * size,
      y + corners[to * 2 + 1] * size,
    );
  }
}

// 正四面体（三角錐）1 つの 6 本の辺を，線分の配列へ足す
export function pushTetra(segments: number[], corners: readonly number[], x: number, y: number, size: number) {
  pushPolyhedron(segments, corners, TETRA_EDGES, x, y, size);
}

// 線分の配列を，1 回の線引きでまとめて描く
export function strokeSegments(context: CanvasRenderingContext2D, segments: readonly number[], color: string, alpha: number, width: number) {
  if (segments.length === 0) return;
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  for (let index = 0; index < segments.length; index += 4) {
    context.moveTo(segments[index], segments[index + 1]);
    context.lineTo(segments[index + 2], segments[index + 3]);
  }
  context.stroke();
}

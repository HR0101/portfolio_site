import { WORLD_DOT_BITS, WORLD_DOT_COLUMNS, WORLD_DOT_ROWS, WORLD_DOT_LATITUDE_TOP, WORLD_DOT_LATITUDE_BOTTOM } from './worldDotMap';
import { PLANET_LAND_BITS, PLANET_LAND_COLUMNS, PLANET_LAND_ROWS, PLANET_LAND_TOP, PLANET_LAND_BOTTOM } from './planetLandMask';

export interface PlanetPoint { x: number; y: number; z: number; land: boolean; detail?: boolean }
export interface ProjectedPlanetPoint { x: number; y: number; radius: number; alpha: number; depth: number }

export function getPlanetLocation(latitude: number, longitude: number): PlanetPoint {
  const lat = latitude * Math.PI / 180;
  const lon = longitude * Math.PI / 180;
  return { x: Math.cos(lat) * Math.sin(lon), y: Math.sin(lat), z: Math.cos(lat) * Math.cos(lon), land: true };
}

// Reuse the existing Natural Earth land mask; every dot lives on a 3D sphere.
export function createPlanetPoints(oceanCount = 1800, detailCount = 0): PlanetPoint[] {
  const binary = atob(WORLD_DOT_BITS);
  const points: PlanetPoint[] = [];
  for (let row = 0; row < WORLD_DOT_ROWS; row++) {
    const latitude = (WORLD_DOT_LATITUDE_TOP - (row + .5) / WORLD_DOT_ROWS
      * (WORLD_DOT_LATITUDE_TOP - WORLD_DOT_LATITUDE_BOTTOM)) * Math.PI / 180;
    for (let column = 0; column < WORLD_DOT_COLUMNS; column++) {
      const bit = row * WORLD_DOT_COLUMNS + column;
      if (!((binary.charCodeAt(bit >> 3) >> (7 - (bit & 7))) & 1)) continue;
      const longitude = (-180 + (column + .5) / WORLD_DOT_COLUMNS * 360) * Math.PI / 180;
      const radius = Math.cos(latitude);
      points.push({ x: radius * Math.sin(longitude), y: Math.sin(latitude), z: radius * Math.cos(longitude), land: true });
    }
  }
  // A much fainter, evenly distributed ocean makes the volume readable.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  // Equal-area fine points avoid the dense latitude bands at the poles. The
  // separate 50m coastline mask preserves islands and shore detail in Hero.
  const fineLand = detailCount > 0 ? atob(PLANET_LAND_BITS) : '';
  for (let index = 0; index < detailCount; index++) {
    const y = 1 - 2 * (index + .5) / detailCount;
    const radius = Math.sqrt(1 - y * y);
    const longitude = index * goldenAngle;
    const x = radius * Math.sin(longitude), z = radius * Math.cos(longitude);
    const latitude = Math.asin(y) * 180 / Math.PI;
    const row = Math.floor((PLANET_LAND_TOP - latitude) / (PLANET_LAND_TOP - PLANET_LAND_BOTTOM) * PLANET_LAND_ROWS);
    if (row < 0 || row >= PLANET_LAND_ROWS) continue;
    const column = Math.min(PLANET_LAND_COLUMNS - 1, Math.floor((Math.atan2(x, z) / Math.PI + 1) / 2 * PLANET_LAND_COLUMNS));
    const bit = row * PLANET_LAND_COLUMNS + column;
    if ((fineLand.charCodeAt(bit >> 3) >> (7 - (bit & 7))) & 1) points.push({ x, y, z, land: true, detail: true });
  }
  for (let index = 0; index < oceanCount; index++) {
    const y = 1 - 2 * (index + .5) / oceanCount;
    const radius = Math.sqrt(1 - y * y);
    const longitude = index * goldenAngle;
    points.push({ x: radius * Math.cos(longitude), y, z: radius * Math.sin(longitude), land: false });
  }
  return points;
}

export function projectPlanetPoints(
  points: PlanetPoint[], progress: number, width: number, height: number,
  output: ProjectedPlanetPoint[] = [],
  rotation = 0,
  detail = 0,
): ProjectedPlanetPoint[] {
  const fidelity = Math.min(1, Math.max(0, detail));
  const yaw = -2.1 + Math.min(1, Math.max(0, progress)) * 4.1 + rotation;
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const cosX = Math.cos(-.14), sinX = Math.sin(-.14);
  const cosZ = Math.cos(-.12), sinZ = Math.sin(-.12);
  const size = Math.max(0, Math.min(width, height));
  const radius = size * .43;
  const dotScale = size / 400;
  output.length = points.length;
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    const x = point.x * cosY + point.z * sinY;
    const depth = -point.x * sinY + point.z * cosY;
    const y = point.y * cosX - depth * sinX;
    const z = point.y * sinX + depth * cosX;
    const tiltedX = x * cosZ - y * sinZ;
    const tiltedY = x * sinZ + y * cosZ;
    const perspective = 5 / (5 - z);
    const front = Math.max(0, z);
    const dot = output[index] ?? (output[index] = { x: 0, y: 0, radius: 0, alpha: 0, depth: 0 });
    dot.x = width / 2 + tiltedX * radius * perspective;
    dot.y = height / 2 - tiltedY * radius * perspective;
    const baseRadius = point.detail ? .26 : (point.land ? 1.1 - fidelity * .88 : .6 - fidelity * .4);
    dot.radius = Math.max(.12, dotScale * (baseRadius + front * .25 * (1 - fidelity)));
    dot.alpha = z < 0 ? (point.land ? .045 : .025) : (point.land ? .28 + front * .65 : .06 + front * .11);
    if (point.detail) dot.alpha = z < 0 ? 0 : (.5 + front * .45) * fidelity;
    else dot.alpha *= point.land ? 1 - fidelity : 1 - fidelity * .8;
    if (z < 0) dot.alpha *= 1 - fidelity;
    dot.depth = z;
  }
  return output;
}

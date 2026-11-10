export const MAX_BOIDS = 72;
const NEIGHBOR_RADIUS = 0.16;
const SEPARATION_RADIUS = 0.052;
const MAX_SPEED = 0.0035;
export interface Boid { x: number; y: number; vx: number; vy: number }
export function createBoids(random: () => number, count = MAX_BOIDS): Boid[] {
  return Array.from({ length: Math.min(MAX_BOIDS, Math.max(0, count)) }, () => ({ x: random(), y: random(), vx: (random() - 0.5) * 0.004, vy: (random() - 0.5) * 0.004 }));
}

export function stepBoids(boids: readonly Boid[], deltaMs: number, target: { x: number; y: number } | null): Boid[] {
  const step = Math.min(3, Math.max(0, deltaMs / (1000 / 60)));
  if (!step) return boids.map(boid => ({ ...boid }));
  return boids.map((boid, index) => {
    let separationX = 0; let separationY = 0;
    let alignmentX = 0; let alignmentY = 0;
    let centerX = 0; let centerY = 0; let neighbors = 0;
    boids.forEach((other, otherIndex) => {
      if (index === otherIndex) return;
      const dx = boid.x - other.x;
      const dy = boid.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (distance < NEIGHBOR_RADIUS) {
        neighbors += 1;
        alignmentX += other.vx; alignmentY += other.vy;
        centerX += other.x; centerY += other.y;
        if (distance < SEPARATION_RADIUS && distance > 0) {
          separationX += dx / distance; separationY += dy / distance;
        }
      }
    });
    let vx = boid.vx; let vy = boid.vy;
    if (target) {
      // 12 列の情報片で，一枚のカードを構成します．
      const tx = Math.max(0.25, Math.min(0.75, target.x)) + ((index % 12) - 5.5) * 0.035;
      const ty = Math.max(0.25, Math.min(0.75, target.y)) + (Math.floor(index / 12) - 2.5) * 0.042;
      vx = vx * 0.8 + (tx - boid.x) * 0.012 * step;
      vy = vy * 0.8 + (ty - boid.y) * 0.012 * step;
    } else if (neighbors) {
      vx += (separationX * 0.00011 + (alignmentX / neighbors - vx) * 0.035 + (centerX / neighbors - boid.x) * 0.0007) * step;
      vy += (separationY * 0.00011 + (alignmentY / neighbors - vy) * 0.035 + (centerY / neighbors - boid.y) * 0.0007) * step;
    }
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED) { vx *= MAX_SPEED / speed; vy *= MAX_SPEED / speed; }
    return { x: (boid.x + vx * step + 1) % 1, y: (boid.y + vy * step + 1) % 1, vx, vy };
  });
}

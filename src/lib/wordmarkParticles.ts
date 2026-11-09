export interface WordmarkParticle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  accent: boolean;
}

export interface ParticlePointer {
  x: number;
  y: number;
  radius: number;
  previousX?: number;
  previousY?: number;
}

const SPRING_STIFFNESS = 100;
const DAMPING = 10;
const REPULSION = 8_000;
const SWEEP_IMPULSE = 350;
const MAX_DISPLACEMENT = 96;
const MAX_STEP_SECONDS = 1 / 120;

// 物理座標はCSS px．DPRは描画だけに使い，画面の倍率で反発範囲が変わらないようにする．
export function stepWordmarkParticles(
  particles: WordmarkParticle[],
  pointer: ParticlePointer | null,
  elapsedSeconds: number,
): boolean {
  const elapsed = Math.min(Math.max(elapsedSeconds, 0), 0.05);
  if (elapsed === 0) return false;
  const steps = Math.ceil(elapsed / MAX_STEP_SECONDS);
  const dt = elapsed / steps;
  const fromX = pointer?.previousX ?? pointer?.x ?? 0;
  const fromY = pointer?.previousY ?? pointer?.y ?? 0;
  const travelX = (pointer?.x ?? fromX) - fromX;
  const travelY = (pointer?.y ?? fromY) - fromY;
  const travelSquared = travelX * travelX + travelY * travelY;
  const travel = Math.sqrt(travelSquared);
  let moving = false;

  for (const particle of particles) {
    // フレームの間に通り過ぎた軌跡にも反応させる．
    // 一度の通過で速度を与えるため，高速移動や描画頻度で反応が薄くならない．
    if (pointer && travel > 0.01) {
      const projection = Math.min(1, Math.max(0,
        ((particle.x - fromX) * travelX + (particle.y - fromY) * travelY) / travelSquared,
      ));
      const dx = particle.x - (fromX + travelX * projection);
      const dy = particle.y - (fromY + travelY * projection);
      const distance = Math.hypot(dx, dy);
      if (distance < pointer.radius) {
        const impulse = SWEEP_IMPULSE * Math.min(travel / pointer.radius, 1.25)
          * (1 - distance / pointer.radius) ** 2;
        // 軌跡の真上にある点は進行方向の横へ逃がす．
        particle.vx += (distance > 0.001 ? dx / distance : -travelY / travel) * impulse;
        particle.vy += (distance > 0.001 ? dy / distance : travelX / travel) * impulse;
      }
    }
    for (let step = 0; step < steps; step++) {
      let ax = (particle.originX - particle.x) * SPRING_STIFFNESS - particle.vx * DAMPING;
      let ay = (particle.originY - particle.y) * SPRING_STIFFNESS - particle.vy * DAMPING;
      if (pointer) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < pointer.radius) {
          const force = REPULSION * (1 - distance / pointer.radius) ** 2;
          // 点とカーソルが完全に重なっても，0で割らない．
          ax += (distance > 0.001 ? dx / distance : 1) * force;
          ay += (distance > 0.001 ? dy / distance : 0) * force;
        }
      }
      particle.vx += ax * dt;
      particle.vy += ay * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      const dx = particle.x - particle.originX;
      const dy = particle.y - particle.originY;
      const displacement = Math.hypot(dx, dy);
      if (displacement > MAX_DISPLACEMENT) {
        particle.x = particle.originX + dx / displacement * MAX_DISPLACEMENT;
        particle.y = particle.originY + dy / displacement * MAX_DISPLACEMENT;
        particle.vx *= 0.35;
        particle.vy *= 0.35;
      }
    }

    if (Math.hypot(particle.x - particle.originX, particle.y - particle.originY) < 0.08
      && Math.hypot(particle.vx, particle.vy) < 0.4) {
      particle.x = particle.originX;
      particle.y = particle.originY;
      particle.vx = 0;
      particle.vy = 0;
    } else {
      moving = true;
    }
  }
  return moving;
}

export function resetWordmarkParticles(particles: WordmarkParticle[]): void {
  for (const particle of particles) {
    particle.x = particle.originX;
    particle.y = particle.originY;
    particle.vx = 0;
    particle.vy = 0;
  }
}

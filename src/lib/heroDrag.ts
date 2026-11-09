export interface HeroDragRotation {
  pitch: number;
  yaw: number;
  pitchVelocity: number;
  yawVelocity: number;
  active: boolean;
}

const MAX_PITCH = 0.55;
const MAX_YAW = 1.1;
const STIFFNESS = 100;
const DAMPING = 10;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export function createHeroDragRotation(): HeroDragRotation {
  return { pitch: 0, yaw: 0, pitchVelocity: 0, yawVelocity: 0, active: false };
}

// The drag starts from the currently rendered angle, including during a return.
export function setHeroDragRotation(state: HeroDragRotation, pitch: number, yaw: number) {
  state.active = true;
  state.pitch = clamp(pitch, MAX_PITCH);
  state.yaw = clamp(yaw, MAX_YAW);
  state.pitchVelocity = 0;
  state.yawVelocity = 0;
}

export function stepHeroDragReturn(state: HeroDragRotation, elapsedSeconds: number): boolean {
  if (state.active) return false;
  const elapsed = Math.min(Math.max(elapsedSeconds, 0), 0.05);
  const steps = Math.ceil(elapsed / (1 / 120));
  const dt = steps ? elapsed / steps : 0;
  for (let step = 0; step < steps; step++) {
    state.pitchVelocity += (-state.pitch * STIFFNESS - state.pitchVelocity * DAMPING) * dt;
    state.yawVelocity += (-state.yaw * STIFFNESS - state.yawVelocity * DAMPING) * dt;
    state.pitch += state.pitchVelocity * dt;
    state.yaw += state.yawVelocity * dt;
  }
  if (Math.hypot(state.pitch, state.yaw) < 0.0001
    && Math.hypot(state.pitchVelocity, state.yawVelocity) < 0.001) {
    resetHeroDragRotation(state);
    return false;
  }
  return true;
}

export function resetHeroDragRotation(state: HeroDragRotation) {
  Object.assign(state, createHeroDragRotation());
}

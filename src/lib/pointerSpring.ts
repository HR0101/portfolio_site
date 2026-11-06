// A small damped spring for pointer-driven decoration. It sleeps at rest and
// owns no React state, so moving the mouse never re-renders page content.
export function createPointerSpring(size: number, render: (values: readonly number[]) => void) {
  const values = Array<number>(size).fill(0);
  const velocities = Array<number>(size).fill(0);
  let targets = Array<number>(size).fill(0);
  let frame = 0;
  let previous = 0;
  let disposed = false;
  const tick = (now: number) => {
    frame = 0;
    const elapsed = previous ? Math.min((now - previous) / 1000, .032) : 1 / 60;
    previous = now;
    // Substeps keep the spring stable on slower displays and after long frames.
    const steps = Math.ceil(elapsed / .008);
    const dt = elapsed / steps;
    let moving = false;
    for (let index = 0; index < size; index++) {
      for (let step = 0; step < steps; step++) {
        velocities[index] += ((targets[index] - values[index]) * 190 - velocities[index] * 21) * dt;
        values[index] += velocities[index] * dt;
      }
      if (Math.abs(targets[index] - values[index]) > .015 || Math.abs(velocities[index]) > .03) moving = true;
      else { values[index] = targets[index]; velocities[index] = 0; }
    }
    render(values);
    if (moving && !disposed) frame = requestAnimationFrame(tick);
    else previous = 0;
  };
  return {
    to(next: number[]) {
      if (disposed) return;
      targets = next;
      if (!frame) frame = requestAnimationFrame(tick);
    },
    reset() {
      cancelAnimationFrame(frame); frame = 0; previous = 0;
      values.fill(0); velocities.fill(0); targets.fill(0);
      render(values);
    },
    dispose() { disposed = true; cancelAnimationFrame(frame); },
  };
}

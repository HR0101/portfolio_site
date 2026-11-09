export interface PlanetJourneyFrame { left: number; top: number; size: number }

export function getHeroPlanetFrame(
  source: { left: number; top: number; width: number; height: number }, viewportWidth: number, viewportHeight = viewportWidth * .7,
): PlanetJourneyFrame {
  if (viewportWidth >= 960) {
    const size = Math.min(viewportWidth, viewportHeight * 1.16);
    return {
      left: viewportWidth * .82 - size / 2,
      top: Math.max(source.top + source.height / 2, viewportHeight * .55 + 38) - size / 2,
      size,
    };
  }
  const size = Math.min(source.width * 1.38, Math.max(0, viewportWidth - 32));
  return {
    left: Math.max(16, Math.min(viewportWidth - size - 16, source.left + source.width / 2 - size / 2)),
    top: source.top + source.height / 2 - size / 2,
    size,
  };
}

export function getPlanetJourneyDetail(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - t * t * (3 - 2 * t);
}

// Scroll position owns the path. It works identically forwards, backwards and
// after jumping into the middle of the page; there is no accumulated velocity.
export function getPlanetJourneyFrame(
  source: PlanetJourneyFrame, destination: PlanetJourneyFrame, progress: number,
): PlanetJourneyFrame {
  const t = Math.min(1, Math.max(0, progress));
  const eased = t * t * (3 - 2 * t);
  return {
    left: source.left + (destination.left - source.left) * eased,
    top: source.top + (destination.top - source.top) * eased,
    size: source.size + (destination.size - source.size) * eased,
  };
}

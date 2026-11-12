export type AsciiMode = 'ascii' | 'edge' | 'color' | 'mono';
const asciiRamp = ' .:-=+*#%@';
const channelMax = 255;
const edgeThreshold = 80;
export const asciiModes: readonly AsciiMode[] = ['ascii', 'edge', 'color', 'mono'];

export function luminance(red: number, green: number, blue: number) {
  const clamp = (value: number) => Number.isFinite(value) ? Math.min(channelMax, Math.max(0, value)) : 0;
  return clamp(red) * 0.2126 + clamp(green) * 0.7152 + clamp(blue) * 0.0722;
}

export function brightnessToCharacter(value: number) {
  const safe = Number.isFinite(value) ? Math.min(channelMax, Math.max(0, value)) : 0;
  return asciiRamp[Math.round(safe / channelMax * (asciiRamp.length - 1))];
}

// Sobel勾配に直交する輪郭線を，4方向の記号へ量子化する．
export function edgeCharacter(gx: number, gy: number, threshold = edgeThreshold) {
  if (!Number.isFinite(gx) || !Number.isFinite(gy) || Math.hypot(gx, gy) < threshold) return ' ';
  const angle = ((Math.atan2(gy, gx) + Math.PI / 2) % Math.PI + Math.PI) % Math.PI;
  return ['-', '\\', '|', '/'][Math.round(angle / (Math.PI / 4)) % 4];
}

export function sobelAt(values: readonly number[], width: number, height: number, x: number, y: number) {
  const at = (dx: number, dy: number) => values[Math.min(height - 1, Math.max(0, y + dy)) * width + Math.min(width - 1, Math.max(0, x + dx))] ?? 0;
  return {
    gx: -at(-1, -1) + at(1, -1) - 2 * at(-1, 0) + 2 * at(1, 0) - at(-1, 1) + at(1, 1),
    gy: -at(-1, -1) - 2 * at(0, -1) - at(1, -1) + at(-1, 1) + 2 * at(0, 1) + at(1, 1),
  };
}

export function halfBlock(top: readonly number[], bottom: readonly number[], mono: boolean) {
  const color = (pixel: readonly number[]) => {
    const gray = Math.round(luminance(pixel[0], pixel[1], pixel[2]));
    return mono ? `rgb(${gray},${gray},${gray})` : `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
  };
  return { character: '▀', foreground: color(top), background: color(bottom) };
}

interface PreviewBounds { left: number; right: number; top: number; bottom: number }

// Keep the decoration inside both the Apps panel and the visible viewport.
export function getCursorPreviewPosition(
  x: number, y: number, width: number, height: number,
  bounds: PreviewBounds, viewportWidth: number, viewportHeight: number,
) {
  const minX = Math.max(16, bounds.left);
  const maxX = Math.max(minX, Math.min(bounds.right, viewportWidth - 16) - width);
  const minY = Math.max(88, bounds.top);
  const maxY = Math.max(minY, Math.min(bounds.bottom, viewportHeight - 16) - height);
  const preferredX = x + width + 32 <= Math.min(bounds.right, viewportWidth - 16)
    ? x + 32 : x - width - 32;
  return {
    x: Math.min(maxX, Math.max(minX, preferredX)),
    y: Math.min(maxY, Math.max(minY, y - height / 2)),
    minX, maxX, minY, maxY,
  };
}

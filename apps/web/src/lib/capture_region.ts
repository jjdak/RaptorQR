export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface NormalizedCaptureRegion extends NormalizedPoint {
  width: number;
  height: number;
}

export interface PixelCaptureRegion extends NormalizedPoint {
  width: number;
  height: number;
}

export interface CaptureSize {
  width: number;
  height: number;
}

export const FULL_CAPTURE_REGION: NormalizedCaptureRegion = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export function pointInCaptureElement(
  clientX: number,
  clientY: number,
  left: number,
  top: number,
  width: number,
  height: number,
): NormalizedPoint {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return {
    x: clamp01((clientX - left) / width),
    y: clamp01((clientY - top) / height),
  };
}

export function captureRegionFromPoints(
  start: NormalizedPoint,
  end: NormalizedPoint,
): NormalizedCaptureRegion {
  const startX = clamp01(start.x);
  const startY = clamp01(start.y);
  const endX = clamp01(end.x);
  const endY = clamp01(end.y);
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

export function captureRegionToPixels(
  region: NormalizedCaptureRegion,
  sourceWidth: number,
  sourceHeight: number,
): PixelCaptureRegion {
  const safeWidth = Math.max(1, Math.floor(sourceWidth));
  const safeHeight = Math.max(1, Math.floor(sourceHeight));
  const x = Math.min(safeWidth - 1, Math.max(0, Math.floor(clamp01(region.x) * safeWidth)));
  const y = Math.min(safeHeight - 1, Math.max(0, Math.floor(clamp01(region.y) * safeHeight)));
  const maxWidth = safeWidth - x;
  const maxHeight = safeHeight - y;
  const width = Math.min(
    maxWidth,
    Math.max(1, Math.round(clamp01(region.width) * safeWidth)),
  );
  const height = Math.min(
    maxHeight,
    Math.max(1, Math.round(clamp01(region.height) * safeHeight)),
  );
  return { x, y, width, height };
}

export function fitCaptureSize(
  sourceWidth: number,
  sourceHeight: number,
  maxDimension = 640,
): CaptureSize {
  const width = Math.max(1, Math.floor(sourceWidth));
  const height = Math.max(1, Math.floor(sourceHeight));
  const limit = Math.max(1, Math.floor(maxDimension));
  const scale = Math.min(1, limit / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

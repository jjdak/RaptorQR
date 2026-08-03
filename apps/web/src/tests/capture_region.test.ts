import { describe, expect, it } from 'vitest';
import {
  captureRegionFromPoints,
  captureRegionToPixels,
  fitCaptureSize,
  pointInCaptureElement,
} from '@/lib/capture_region';

describe('screen capture region', () => {
  it('normalizes pointer coordinates and clamps points outside the preview', () => {
    expect(pointInCaptureElement(150, 100, 50, 50, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
    expect(pointInCaptureElement(-20, 400, 50, 50, 200, 100)).toEqual({ x: 0, y: 1 });
  });

  it('creates the same region regardless of drag direction', () => {
    const expected = { x: 0.2, y: 0.1, width: 0.6, height: 0.6 };
    for (const region of [
      captureRegionFromPoints({ x: 0.2, y: 0.1 }, { x: 0.8, y: 0.7 }),
      captureRegionFromPoints({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 }),
    ]) {
      expect(region.x).toBeCloseTo(expected.x);
      expect(region.y).toBeCloseTo(expected.y);
      expect(region.width).toBeCloseTo(expected.width);
      expect(region.height).toBeCloseTo(expected.height);
    }
  });

  it('maps a normalized region to bounded source pixels', () => {
    expect(captureRegionToPixels(
      { x: 0.25, y: 0.2, width: 0.5, height: 0.6 },
      1920,
      1080,
    )).toEqual({ x: 480, y: 216, width: 960, height: 648 });

    expect(captureRegionToPixels(
      { x: 0.99, y: 0.99, width: 1, height: 1 },
      100,
      100,
    )).toEqual({ x: 99, y: 99, width: 1, height: 1 });
  });

  it('fits the selected source region within the decoder size cap', () => {
    expect(fitCaptureSize(1920, 1080)).toEqual({ width: 640, height: 360 });
    expect(fitCaptureSize(320, 200)).toEqual({ width: 320, height: 200 });
    expect(fitCaptureSize(400, 800)).toEqual({ width: 320, height: 640 });
  });
});

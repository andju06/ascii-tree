import type { CameraView } from "./Camera";
import type { Viewport } from "./Viewport";

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

const NEAR_PLANE = 0.1;

/** Same camera model as `AsciiRasterizer`, for one-off points such as sprite anchors. */
export function projectPoint(
  camera: CameraView,
  viewport: Viewport,
  x: number,
  y: number,
  z: number,
): ScreenPoint | null {
  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);
  const xr = x * cosY - z * sinY;
  const zr = x * sinY + z * cosY;
  const yc = y - camera.target;
  const yr = yc * Math.cos(camera.pitch) + zr * Math.sin(camera.pitch);
  const depth = camera.distance - yc * Math.sin(camera.pitch) + zr * Math.cos(camera.pitch);
  if (depth < NEAR_PLANE) return null;
  const scale = (viewport.height * camera.zoom) / depth;
  return {
    x: viewport.width / 2 + xr * scale,
    y: viewport.height * camera.screenCenterY - yr * scale,
    depth,
  };
}

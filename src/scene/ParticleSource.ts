/** Read-only particle data the rasterizer can draw. */
export interface ParticleSource {
  readonly count: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly r: Float32Array;
  readonly g: Float32Array;
  readonly b: Float32Array;
  readonly bright: Float32Array;
  readonly appear: Float32Array;
  readonly phase: Float32Array;
  readonly drop: Float32Array;
  readonly kind: Uint8Array;
}

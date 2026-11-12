import type { CodeSegment } from "./CodeScript";

/** Display-only source typed into the editor; each segment unlocks one build stage. */
export const TREE_SOURCE: readonly CodeSegment[] = [
  {
    stage: "ground",
    code: `
// tree.ts - ASCII Christmas Tree
scatter(Kind.Ground, 9000, disc(3.8));`,
  },
  {
    stage: "envelope",
    code: `
const cone = (y: number) => 1.72 * (1 - (y - 0.55) / 3.65);`,
  },
  {
    stage: "trunk",
    code: `
grow(Kind.Trunk, 1100, cylinder(0.14, 0.95));`,
  },
  {
    stage: "branches",
    code: `
for (let y = 0.55; y < 4.1; y += 0.074)
  grow(Kind.Leaf, branches(y, cone(y)));`,
  },
  {
    stage: "ornaments",
    code: `
hang(46, ["#eb2427", "#ffc24d", "#d9dde8", "#407ad9"]);`,
  },
  {
    stage: "lights",
    code: `
spiral(Kind.Light, 260, { turns: 7, along: cone });`,
  },
  {
    stage: "star",
    code: `
star(4.44, { points: 5, glow: true });`,
  },
  {
    stage: "snow",
    code: `
snow(650).fall(0.4);`,
  },
  {
    code: `
onFrame((t) => renderer.draw(store, camera.orbit(t * 0.35)));`,
  },
  {
    code: `

// ─────────────────────────────────────
//   (\\_/)      made with <3 by
//   ( •.•)     daisy & ollie
//   / > [*]    merry christmas 2026
// ─────────────────────────────────────`,
  },
];

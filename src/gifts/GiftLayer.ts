import { Random } from "../core/Random";
import type { Resettable, Updatable } from "../core/types";
import type { EffectSink } from "../effects/EffectsSystem";
import { emitGiftBurst, emitSparkleRise, type Point3 } from "../effects/emitters";
import { ParticleStore } from "../scene/ParticleStore";
import type { Gift } from "./Gift";
import { addGiftParticles } from "./giftGeometry";
import type { GiftLayout, PlacedGift } from "./GiftLayout";
import type { OpenedGifts } from "./OpenedGifts";

export interface GiftTraits {
  /** Never trimmed when the pile exceeds `maxGifts`. */
  readonly pinned: boolean;
  /** Periodically rattles while still wrapped. */
  readonly wobble: boolean;
}

const DEFAULT_TRAITS: GiftTraits = { pinned: false, wobble: false };

interface RestPose {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly bright: Float32Array;
}

interface GiftEntry {
  placed: PlacedGift;
  traits: GiftTraits;
  appear: number;
  drop: number;
  start: number;
  end: number;
  rest: RestPose | null;
  posed: boolean;
}

interface Pose {
  readonly tilt: number;
  readonly lift: number;
  readonly brightness: number;
}

const REST: Pose = { tilt: 0, lift: 0, brightness: 1 };
const HOVER_LIFT = 0.08;
const HOVER_BRIGHTNESS = 1.4;

export interface GiftLayerOptions {
  readonly maxGifts: number;
  readonly capacity: number;
  readonly density: number;
  readonly revealStagger: number;
  readonly wobblePeriod: number;
  readonly wobbleDuration: number;
  /** Average idle sparkle bursts per second for each wrapped gift. */
  readonly idleSparkleRate: number;
}

const DEFAULT_OPTIONS: GiftLayerOptions = {
  maxGifts: 60,
  capacity: 120_000,
  density: 700,
  revealStagger: 0.06,
  wobblePeriod: 4.5,
  wobbleDuration: 0.7,
  idleSparkleRate: 0.25,
};

const CONFETTI_GOLD = [1, 0.84, 0.35] as const;
const CONFETTI_WHITE = [1, 1, 1] as const;

/**
 * Owns the particle store for user gifts (boxes and ornaments). Gifts stay hidden until `reveal`,
 * then rise into place with sparkles; later arrivals drop from the sky.
 */
export class GiftLayer implements Updatable, Resettable {
  readonly store: ParticleStore;
  private entries: GiftEntry[] = [];
  private readonly ids = new Set<string>();
  private revealTime: number | null = null;
  private hoveredId: string | null = null;
  private readonly options: GiftLayerOptions;
  private readonly fxRng: Random;

  constructor(
    private readonly layout: GiftLayout,
    private readonly opened: OpenedGifts,
    private readonly effects: EffectSink,
    private readonly seed: number,
    options: Partial<GiftLayerOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.store = new ParticleStore(this.options.capacity);
    this.fxRng = Random.derive(seed, "gift-fx");
  }

  get count(): number {
    return this.entries.length;
  }

  get unopenedCount(): number {
    return this.entries.filter((entry) => !this.opened.has(entry.placed.gift.id)).length;
  }

  get revealed(): boolean {
    return this.revealTime !== null;
  }

  setHovered(id: string | null): void {
    this.hoveredId = id;
  }

  /** A wrapped, regular gift to point the "click me" hint at. */
  hintTarget(): Gift | null {
    const wrapped = this.entries.filter((entry) => !this.opened.has(entry.placed.gift.id));
    const regular = wrapped.find((entry) => !entry.traits.pinned) ?? wrapped[0];
    return regular ? regular.placed.gift : null;
  }

  /** Adds gifts not yet known. Before reveal they stay hidden; afterwards they rise (initial) or fall (new). */
  addGifts(gifts: readonly Gift[], time: number, arrival: "rise" | "fall", traits: GiftTraits = DEFAULT_TRAITS): void {
    const fresh = gifts.filter((gift) => !this.ids.has(gift.id));
    if (fresh.length === 0) return;

    fresh.forEach((gift, index) => {
      this.ids.add(gift.id);
      const entry: GiftEntry = {
        placed: this.layout.place(gift),
        traits,
        appear: Infinity,
        drop: 0,
        start: 0,
        end: 0,
        rest: null,
        posed: false,
      };
      this.entries.push(entry);
      if (this.revealTime === null) return;
      if (arrival === "rise") this.scheduleRise(entry, time + index * this.options.revealStagger);
      else this.scheduleFall(entry, time);
    });

    if (this.entries.length > this.options.maxGifts) this.trimOldest();
    else this.rebuild();
  }

  reveal(time: number): void {
    if (this.revealTime !== null) return;
    this.revealTime = time;
    this.entries.forEach((entry, index) => this.scheduleRise(entry, time + 0.4 + index * this.options.revealStagger));
    this.rebuild();
  }

  /** Unwraps the gift for this browser. Returns false when it was already opened. */
  open(id: string, time: number): boolean {
    const entry = this.findEntry(id);
    if (!entry || this.opened.has(id)) return false;
    this.opened.add(id);
    const { placed } = entry;
    emitGiftBurst(
      this.effects,
      this.fxRng,
      { x: placed.x, y: placed.y + placed.height * 0.6, z: placed.z },
      [placed.body, placed.accent, CONFETTI_GOLD, CONFETTI_WHITE],
      time,
    );
    entry.appear = time;
    entry.drop = 0;
    this.rebuild();
    return true;
  }

  giftAt(particleIndex: number): Gift | null {
    const entry = this.entries.find((candidate) => particleIndex >= candidate.start && particleIndex < candidate.end);
    return entry ? entry.placed.gift : null;
  }

  /** Top-center of the gift in world space. */
  topOf(id: string): Point3 | null {
    const entry = this.findEntry(id);
    if (!entry) return null;
    const { placed } = entry;
    return { x: placed.x, y: placed.y + placed.height, z: placed.z };
  }

  update(dt: number, time: number): void {
    for (const entry of this.entries) {
      if (!entry.rest || time < entry.appear + 1) continue;
      const id = entry.placed.gift.id;
      const wrapped = !this.opened.has(id);
      const pose = this.poseFor(entry, wrapped, time);

      if (pose !== REST) {
        this.applyPose(entry, pose);
        entry.posed = true;
      } else if (entry.posed) {
        this.restorePose(entry);
        entry.posed = false;
      }

      if (wrapped && dt > 0 && this.fxRng.random() < dt * this.options.idleSparkleRate) {
        const top = { x: entry.placed.x, y: entry.placed.y + entry.placed.height, z: entry.placed.z };
        emitSparkleRise(this.effects, this.fxRng, top, entry.placed.accent, time, 5);
      }
    }
  }

  private poseFor(entry: GiftEntry, wrapped: boolean, time: number): Pose {
    const { wobblePeriod, wobbleDuration } = this.options;
    let tilt = 0;
    let lift = 0;
    if (entry.traits.wobble && wrapped) {
      const local = (time - entry.appear) % wobblePeriod;
      if (local < wobbleDuration) {
        const progress = local / wobbleDuration;
        const envelope = 1 - progress;
        tilt = Math.sin(progress * Math.PI * 4) * 0.2 * envelope;
        lift = Math.abs(Math.sin(progress * Math.PI * 2)) * 0.035 * envelope;
      }
    }
    const hovered = this.hoveredId === entry.placed.gift.id;
    if (!hovered && tilt === 0 && lift === 0) return REST;
    return {
      tilt,
      lift: lift + (hovered ? HOVER_LIFT : 0),
      brightness: hovered ? HOVER_BRIGHTNESS : 1,
    };
  }

  reset(): void {
    this.revealTime = null;
    for (const entry of this.entries) entry.appear = Infinity;
    this.rebuild();
  }

  private findEntry(id: string): GiftEntry | undefined {
    return this.entries.find((candidate) => candidate.placed.gift.id === id);
  }

  private scheduleRise(entry: GiftEntry, at: number): void {
    entry.appear = at;
    entry.drop = -entry.placed.riseDepth;
    emitSparkleRise(this.effects, this.fxRng, this.baseOf(entry.placed), entry.placed.body, at);
  }

  private scheduleFall(entry: GiftEntry, at: number): void {
    entry.appear = at;
    entry.drop = entry.placed.fallHeight;
    emitSparkleRise(this.effects, this.fxRng, this.baseOf(entry.placed), entry.placed.body, at + 0.8, 48);
  }

  private baseOf(placed: PlacedGift): Point3 {
    return { x: placed.x, y: placed.y, z: placed.z };
  }

  /** Tilts the box around its bottom edge (radial plane), lifts it, and scales brightness. */
  private applyPose(entry: GiftEntry, pose: Pose): void {
    const rest = entry.rest;
    if (!rest) return;
    const { placed } = entry;
    const radial = Math.hypot(placed.x, placed.z) || 1;
    const dx = placed.x / radial;
    const dz = placed.z / radial;
    const cos = Math.cos(pose.tilt);
    const sin = Math.sin(pose.tilt);
    const { x, y, z, bright } = this.store;

    for (let k = 0, i = entry.start; i < entry.end; i++, k++) {
      const rx = rest.x[k] - placed.x;
      const ry = rest.y[k] - placed.y;
      const rz = rest.z[k] - placed.z;
      const u = rx * dx + rz * dz;
      const shift = u * cos - ry * sin - u;
      x[i] = rest.x[k] + shift * dx;
      y[i] = placed.y + u * sin + ry * cos + pose.lift;
      z[i] = rest.z[k] + shift * dz;
      bright[i] = rest.bright[k] * pose.brightness;
    }
  }

  private restorePose(entry: GiftEntry): void {
    const rest = entry.rest;
    if (!rest) return;
    this.store.x.set(rest.x, entry.start);
    this.store.y.set(rest.y, entry.start);
    this.store.z.set(rest.z, entry.start);
    this.store.bright.set(rest.bright, entry.start);
  }

  private trimOldest(): void {
    const pinned = this.entries.filter((entry) => entry.traits.pinned);
    const regular = this.entries.filter((entry) => !entry.traits.pinned);
    const room = Math.max(0, this.options.maxGifts - pinned.length);
    const keptRegular = room === 0 ? [] : regular.slice(-room);
    const dropped = regular.slice(0, regular.length - keptRegular.length);
    for (const entry of dropped) this.ids.delete(entry.placed.gift.id);

    this.layout.clear();
    this.entries = [...pinned, ...keptRegular].map((entry) => ({
      ...entry,
      placed: this.layout.place(entry.placed.gift),
    }));
    this.rebuild();
  }

  private rebuild(): void {
    this.store.clear();
    for (const entry of this.entries) {
      const { gift } = entry.placed;
      const opened = this.opened.has(gift.id);
      entry.start = this.store.count;
      addGiftParticles(this.store, Random.derive(this.seed, `paint:${gift.id}`), entry.placed, {
        appear: entry.appear,
        drop: entry.drop,
        opened,
        density: this.options.density,
      });
      entry.end = this.store.count;
      entry.posed = false;
      entry.rest = {
        x: this.store.x.slice(entry.start, entry.end),
        y: this.store.y.slice(entry.start, entry.end),
        z: this.store.z.slice(entry.start, entry.end),
        bright: this.store.bright.slice(entry.start, entry.end),
      };
    }
  }
}

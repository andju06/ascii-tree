import { Clock } from "./core/Clock";
import { EventBus } from "./core/EventBus";
import { Random } from "./core/Random";
import type { AppEvents, Updatable } from "./core/types";
import { CodeScript } from "./editor/CodeScript";
import { EditorView } from "./editor/EditorView";
import { TsHighlighter } from "./editor/SyntaxHighlighter";
import { Typer } from "./editor/Typer";
import { TREE_SOURCE } from "./editor/treeSource";
import { EASTER_GIFT, SANTA_ESCAPED, SANTA_MARK, SANTA_MARK_FONT } from "./easter/easterGift";
import { SantaRunner } from "./easter/SantaRunner";
import { SNOWMAN_GIFT, SNOWMAN_MELTED, SNOWMAN_SERVED } from "./easter/snowmanGift";
import { SNOWMAN_SPRITE, SnowmanChase } from "./easter/SnowmanChase";
import { EffectsSystem } from "./effects/EffectsSystem";
import type { Gift } from "./gifts/Gift";
import { createGiftRepository } from "./gifts/createGiftRepository";
import { GiftHint } from "./gifts/GiftHint";
import { GiftHoverLabel } from "./gifts/GiftHoverLabel";
import { GiftLayer } from "./gifts/GiftLayer";
import { BoxPilePlacer } from "./gifts/BoxPilePlacer";
import { GiftLayout } from "./gifts/GiftLayout";
import { OrnamentPlacer } from "./gifts/OrnamentPlacer";
import { OpenedGifts } from "./gifts/OpenedGifts";
import { SubmitCooldown } from "./gifts/SubmitCooldown";
import { randomGiftStyle } from "./gifts/style";
import { ReadReplies } from "./replies/ReadReplies";
import { HudView, type RunStatus } from "./hud/HudView";
import { bindControls } from "./interaction/Controls";
import { Picker } from "./interaction/Picker";
import { AsciiRasterizer } from "./render/AsciiRasterizer";
import { Camera } from "./render/Camera";
import { CanvasPresenter } from "./render/CanvasPresenter";
import type { FrameBuffer } from "./render/FrameBuffer";
import { SpriteLayer } from "./render/SpriteLayer";
import { StarfieldBackground } from "./render/StarfieldBackground";
import type { Viewport } from "./render/Viewport";
import type { ParticleSource } from "./scene/ParticleSource";
import { GrowthWave } from "./scene/GrowthWave";
import { ParticleStore } from "./scene/ParticleStore";
import { Scene } from "./scene/Scene";
import { ConeShape } from "./scene/TreeShape";
import { BranchBuilder } from "./scene/builders/BranchBuilder";
import { EnvelopeBuilder } from "./scene/builders/EnvelopeBuilder";
import { GroundBuilder } from "./scene/builders/GroundBuilder";
import { LightBuilder } from "./scene/builders/LightBuilder";
import { OrnamentBuilder } from "./scene/builders/OrnamentBuilder";
import { SnowBuilder } from "./scene/builders/SnowBuilder";
import { StarBuilder } from "./scene/builders/StarBuilder";
import { TrunkBuilder } from "./scene/builders/TrunkBuilder";
import { GiftComposer } from "./ui/GiftComposer";
import { GiftPopup } from "./ui/GiftPopup";
import { GuestbookList } from "./ui/GuestbookList";

const SEED = 20261225;
const FONT_FAMILY = '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export interface TreeAppOptions {
  /** Gifts API base URL; empty or undefined keeps gifts in browser storage. */
  readonly giftApiUrl?: string;
}

/** Wires the whole experience onto the markup rendered by `TreeApp`. Returns a disposer. */
export function startTreeApp({ giftApiUrl }: TreeAppOptions): () => void {
  const lifetime = new AbortController();
  const bus = new EventBus<AppEvents>();
  const clock = new Clock();

  const treeStore = new ParticleStore(150_000);
  const treeShape = new ConeShape();
  const scene = new Scene(
    treeStore,
    treeShape,
    new GrowthWave(),
    [
      new GroundBuilder(),
      new EnvelopeBuilder(),
      new TrunkBuilder(),
      new BranchBuilder(),
      new OrnamentBuilder(),
      new LightBuilder(),
      new StarBuilder(),
      new SnowBuilder(),
    ],
    SEED,
  );

  const effects = new EffectsSystem();
  const giftLayout = new GiftLayout(SEED, {
    box: new BoxPilePlacer({
      goldRibbonIds: new Set([EASTER_GIFT.id]),
      anchors: new Map([[SNOWMAN_GIFT.id, { angle: -1.15, radius: 3.45 }]]),
    }),
    ornament: new OrnamentPlacer(treeShape),
  });
  const giftLayer = new GiftLayer(giftLayout, new OpenedGifts(), effects, SEED);
  const { gifts: giftRepository, replies: replyRepository } = createGiftRepository(giftApiUrl);
  const cooldown = new SubmitCooldown();
  const readReplies = new ReadReplies();

  const sources: readonly ParticleSource[] = [treeStore, giftLayer.store, effects];
  const GIFT_SOURCE = sources.indexOf(giftLayer.store);

  const camera = new Camera();
  const canvas = requireElement<HTMLCanvasElement>("scene");
  const rasterizer = new AsciiRasterizer();
  const sprites = new SpriteLayer(camera);
  const presenter = new CanvasPresenter(canvas, new StarfieldBackground(Random.derive(SEED, "sky")), FONT_FAMILY, [
    sprites,
  ]);
  const santa = new SantaRunner(sprites, effects);
  const snowman = new SnowmanChase(sprites, effects);
  const picker = new Picker();

  const typer = new Typer(new CodeScript(TREE_SOURCE), bus, Random.derive(SEED, "typer"), {
    charsPerSecond: 140,
    linePause: 0.03,
    startDelay: 0.2,
  });
  const editor = new EditorView(requireElement("editor"), new TsHighlighter());
  const hud = new HudView({
    time: requireElement("hud-time"),
    rotation: requireElement("hud-rotation"),
    lights: requireElement("hud-lights"),
    letters: requireElement("hud-letters"),
    status: requireElement("hud-status"),
    gifts: requireElement("hud-gifts"),
  });

  const popup = new GiftPopup(
    {
      root: requireElement("gift-popup"),
      author: requireElement("popup-author"),
      message: requireElement("popup-message"),
      date: requireElement<HTMLTimeElement>("popup-date"),
      swatch: requireElement("popup-swatch"),
    },
    lifetime.signal,
  );

  let syncGuestbook = (): void => {};

  const composer = new GiftComposer(
    {
      trigger: requireElement<HTMLButtonElement>("gift-button"),
      root: requireElement("gift-compose"),
      form: requireElement<HTMLFormElement>("gift-form"),
      author: requireElement<HTMLInputElement>("gift-author"),
      message: requireElement<HTMLTextAreaElement>("gift-message"),
      counter: requireElement("gift-counter"),
      shapes: requireElement("gift-shapes"),
      palette: requireElement("gift-palette"),
      randomColor: requireElement<HTMLButtonElement>("gift-random-color"),
      swatch: requireElement("gift-swatch"),
      sizeLabel: requireElement("gift-size"),
      error: requireElement("gift-error"),
      submit: requireElement<HTMLButtonElement>("gift-submit"),
    },
    async (input) => {
      const wait = cooldown.remainingSeconds();
      if (wait > 0) throw new Error(`${wait}초 후에 다시 선물할 수 있어요.`);
      const gift = await giftRepository.create(input);
      cooldown.mark();
      giftLayer.addGifts([gift], clock.time, "fall");
      syncGuestbook();
    },
    () => randomGiftStyle(),
    lifetime.signal,
  );

  const hint = new GiftHint(sprites, () =>
    giftLayer.unopenedMarks().map((mark) =>
      mark.id === EASTER_GIFT.id ? { ...mark, glyph: SANTA_MARK, font: SANTA_MARK_FONT } : { ...mark, glyph: "♥" },
    ),
  );
  const hoverLabel = new GiftHoverLabel(sprites, giftLayer, (gift) =>
    gift.id === EASTER_GIFT.id || gift.id === SNOWMAN_GIFT.id ? "From. ???" : `From. ${gift.author}`,
  );

  let completed = false;
  let lastFrame: { fb: FrameBuffer; viewport: Viewport } | null = null;

  bus.on("stage", (stage) => scene.activate(stage, clock.time));
  bus.on("complete", () => {
    completed = true;
    giftLayer.reveal(clock.time);
    hint.schedule(clock.time + 1.5 + giftLayer.count * 0.06);
    composer.setAvailable(true);
  });
  bus.on("reset", () => {
    clock.reset();
    scene.reset();
    typer.reset();
    effects.reset();
    santa.reset();
    snowman.reset();
    hint.reset();
    hoverLabel.show(null);
    giftLayer.reset();
    composer.setAvailable(false);
    completed = false;
  });

  giftLayer.addGifts([EASTER_GIFT, SNOWMAN_GIFT], clock.time, "rise", { pinned: true, wobble: true });
  const guestbook = new GuestbookList(
    {
      root: requireElement("guestbook"),
      list: requireElement("guestbook-list"),
      empty: requireElement("guestbook-empty"),
    },
    lifetime.signal,
    {
      entries: () => giftLayer.guestbook(),
      replies: () => replyRepository.current(),
      isReplyRead: (id) => readReplies.has(id),
      readGift: (id) => giftLayer.acknowledge(id),
      readReply: (id) => readReplies.add(id),
      reply: async (input) => {
        const wait = cooldown.remainingSeconds();
        if (wait > 0) throw new Error(`${wait}초 후에 다시 남길 수 있어요.`);
        await replyRepository.create(input);
        cooldown.mark();
      },
    },
  );
  syncGuestbook = () => guestbook.render();

  giftRepository
    .list()
    .then((gifts) => {
      giftLayer.addGifts(gifts, clock.time, "rise");
      syncGuestbook();
    })
    .catch((error: unknown) => console.warn("[gifts] failed to load", error));
  const unsubscribeGifts = giftRepository.subscribe((gifts) => {
    giftLayer.addGifts(gifts, clock.time, "fall");
    syncGuestbook();
  });
  const unsubscribeReplies = replyRepository.subscribe(() => syncGuestbook());

  let reloadToken = 0;
  const rewindButton = requireElement<HTMLButtonElement>("gift-rewind");
  rewindButton.addEventListener(
    "click",
    () => {
      const token = ++reloadToken;
      rewindButton.disabled = true;
      hoverLabel.show(null);
      giftLayer.setHovered(null);
      canvas.style.cursor = "";
      santa.reset();
      snowman.reset();
      giftRepository
        .list()
        .then((gifts) => {
          if (token !== reloadToken) return;
          giftLayer.rewind(gifts, clock.time);
          syncGuestbook();
        })
        .catch((error: unknown) => {
          console.warn("[gifts] failed to rewind", error);
          if (token !== reloadToken) return;
          giftLayer.replayWrapped(clock.time);
          syncGuestbook();
        })
        .finally(() => {
          if (token === reloadToken) rewindButton.disabled = false;
        });
    },
    { signal: lifetime.signal },
  );

  const listButton = requireElement<HTMLButtonElement>("gift-list");
  const refreshButton = requireElement<HTMLButtonElement>("guestbook-refresh");
  let refreshToken = 0;
  const refreshGuestbook = (): void => {
    const token = ++refreshToken;
    refreshButton.disabled = true;
    giftRepository
      .list()
      .then((gifts) => {
        if (token !== refreshToken) return;
        giftLayer.addGifts(gifts, clock.time, "fall");
        syncGuestbook();
      })
      .catch((error: unknown) => {
        console.warn("[gifts] failed to refresh guestbook", error);
      })
      .finally(() => {
        if (token === refreshToken) refreshButton.disabled = false;
      });
  };
  listButton.addEventListener(
    "click",
    () => {
      guestbook.open();
      refreshGuestbook();
    },
    { signal: lifetime.signal },
  );
  refreshButton.addEventListener("click", () => refreshGuestbook(), { signal: lifetime.signal });

  /** Reaction when a gift is clicked; `unwrapped` is true only on the first open in this browser. */
  type GiftOpener = (gift: Gift, unwrapped: boolean) => void;

  const showMessage: GiftOpener = (gift) => popup.show(gift);
  const specialOpeners = new Map<string, GiftOpener>([
    [
      EASTER_GIFT.id,
      (gift, unwrapped) => {
        const top = giftLayer.topOf(gift.id);
        if (unwrapped && top) santa.start(top, clock.time);
        else popup.show(SANTA_ESCAPED);
      },
    ],
    [
      SNOWMAN_GIFT.id,
      (gift, unwrapped) => {
        const top = giftLayer.topOf(gift.id);
        if (unwrapped && top) snowman.start(top, clock.time);
        else if (snowman.catchable) snowman.catch(clock.time);
        else if (!snowman.busy) popup.show(snowman.result() === "caught" ? SNOWMAN_SERVED : SNOWMAN_MELTED);
      },
    ],
  ]);

  function giftUnder(x: number, y: number): Gift | null {
    if (!lastFrame) return null;
    const hit = picker.pick(lastFrame.fb, lastFrame.viewport, x, y, (candidate) => candidate.source === GIFT_SOURCE);
    return hit ? giftLayer.giftAt(hit.index) : null;
  }

  const ZOOM_STEP = 0.15;
  const zoomIn = requireElement<HTMLButtonElement>("zoom-in");
  const zoomOut = requireElement<HTMLButtonElement>("zoom-out");
  const applyZoom = (delta: number): void => {
    camera.nudgeZoom(delta);
    zoomIn.disabled = camera.zoom >= Camera.maxZoom - 0.001;
    zoomOut.disabled = camera.zoom <= Camera.minZoom + 0.001;
  };
  zoomIn.addEventListener("click", () => applyZoom(ZOOM_STEP), { signal: lifetime.signal });
  zoomOut.addEventListener("click", () => applyZoom(-ZOOM_STEP), { signal: lifetime.signal });

  const unbindControls = bindControls(canvas, {
    togglePause: () => clock.togglePause(),
    skip: () => typer.skipToNextStage(),
    restart: () => bus.emit("reset", undefined),
    rotate: (dx, dy) => camera.drag(dx, dy),
    zoom: (delta) => applyZoom(delta),
    hover: (x, y) => {
      const gift = giftUnder(x, y);
      const catching = snowman.catchable && sprites.contains(SNOWMAN_SPRITE, x, y, 36);
      canvas.style.cursor = gift || catching ? "pointer" : "";
      giftLayer.setHovered(gift?.id ?? null);
      hoverLabel.show(gift);
    },
    click: (x, y) => {
      if (snowman.catchable && sprites.contains(SNOWMAN_SPRITE, x, y, 36)) {
        snowman.catch(clock.time);
        return;
      }
      const gift = giftUnder(x, y);
      if (!gift) return;
      hoverLabel.show(null);
      giftLayer.setHovered(null);
      const unwrapped = giftLayer.open(gift.id, clock.time);
      (specialOpeners.get(gift.id) ?? showMessage)(gift, unwrapped);
    },
  });

  const updatables: readonly Updatable[] = [typer, scene, giftLayer, santa, snowman, hint, effects, camera];

  function currentStatus(): RunStatus {
    if (clock.paused) return "paused";
    return completed ? "complete" : "running";
  }

  function frame(nowMs: number): void {
    clock.tick(nowMs);
    if (!clock.paused) {
      for (const item of updatables) item.update(clock.dt, clock.time);
    }

    const viewport = presenter.measure();
    const fb = rasterizer.rasterize(sources, camera, viewport, clock.time);
    presenter.draw(fb, clock.time);
    lastFrame = { fb, viewport };
    editor.render(typer);
    hud.render(
      {
        time: clock.time,
        fps: clock.fps,
        rotationDegrees: camera.rotationDegrees,
        lightsLit: fb.lightsLit,
        lightsTotal: fb.lightsTotal,
        letters: fb.filledCount,
        gifts: giftLayer.count,
        unopened: giftLayer.unopenedCount,
        status: currentStatus(),
      },
      nowMs,
    );
    frameHandle = requestAnimationFrame(frame);
  }

  let frameHandle = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameHandle);
    unbindControls();
    unsubscribeGifts();
    unsubscribeReplies();
    lifetime.abort();
  };
}

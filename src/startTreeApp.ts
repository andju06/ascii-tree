import { Clock } from "./core/Clock";
import { EventBus } from "./core/EventBus";
import { Random } from "./core/Random";
import type { AppEvents, Updatable } from "./core/types";
import { CodeScript } from "./editor/CodeScript";
import { EditorView } from "./editor/EditorView";
import { GuestbookPrint } from "./editor/GuestbookPrint";
import { TsHighlighter } from "./editor/SyntaxHighlighter";
import { Typer } from "./editor/Typer";
import { TREE_SOURCE } from "./editor/treeSource";
import { EASTER_GIFT, SANTA_ESCAPED, SANTA_MARK, SANTA_MARK_FONT } from "./easter/easterGift";
import { SantaRunner } from "./easter/SantaRunner";
import { SNOWMAN_GIFT, SNOWMAN_MELTED, SNOWMAN_SERVED } from "./easter/snowmanGift";
import { SNOWMAN_SPRITE, SnowmanChase } from "./easter/SnowmanChase";
import { EffectsSystem } from "./effects/EffectsSystem";
import type { Gift } from "./gifts/Gift";
import { EntryLockClient } from "./gifts/EntryLockClient";
import { createGiftRepository } from "./gifts/createGiftRepository";
import { ALL_TREE_FEATURES, type TreeFeatures } from "./spaces/features";
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
import { ChristmasParade, RUDOLPH_NOTE, SLEIGH_SPRITE } from "./scene/ChristmasParade";
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

async function shareTree(button: HTMLButtonElement): Promise<void> {
  const url = window.location.href;
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: document.title, url });
      return;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
  }

  try {
    await navigator.clipboard.writeText(url);
    noteShare(button, "링크를 복사했습니다");
  } catch {
    noteShare(button, "공유하지 못했습니다");
  }
}

function noteShare(button: HTMLButtonElement, label: string): void {
  button.setAttribute("aria-label", label);
  button.title = label;
  window.setTimeout(() => {
    button.setAttribute("aria-label", "공유하기");
    button.title = "공유하기";
  }, 1500);
}

export interface TreeAppOptions {
  /** Gifts API base URL; empty or undefined keeps gifts in browser storage. */
  readonly giftApiUrl?: string;
  /** Personal trees require a password to change or remove a guestbook entry. */
  readonly entryPasscode?: boolean;
  /** Decorations on this tree. The public tree keeps all of them. */
  readonly features?: TreeFeatures;
}

/** Wires the whole experience onto the markup rendered by `TreeApp`. Returns a disposer. */
export function startTreeApp({ giftApiUrl, entryPasscode = false, features = ALL_TREE_FEATURES }: TreeAppOptions): () => void {
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
      goldRibbonIds: new Set(features.santa ? [EASTER_GIFT.id] : []),
      anchors: features.snowman ? new Map([[SNOWMAN_GIFT.id, { angle: -1.15, radius: 3.45 }]]) : new Map(),
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
  const parade = new ChristmasParade(sprites, camera);
  const picker = new Picker();

  const typer = new Typer(new CodeScript(TREE_SOURCE), bus, Random.derive(SEED, "typer"), {
    charsPerSecond: 140,
    linePause: 0.03,
    startDelay: 0.2,
  });
  const editorRoot = requireElement("editor");
  const highlighter = new TsHighlighter();
  const editor = new EditorView(editorRoot, highlighter);
  const guestbookPrintRoot = document.createElement("div");
  guestbookPrintRoot.className = "editor-guestbook";
  guestbookPrintRoot.dataset.keep = "";
  guestbookPrintRoot.hidden = true;
  editorRoot.append(guestbookPrintRoot);
  const guestbookPrint = new GuestbookPrint(guestbookPrintRoot, highlighter);
  const hud = new HudView({
    time: requireElement("hud-time"),
    rotation: requireElement("hud-rotation"),
    lights: requireElement("hud-lights"),
    letters: requireElement("hud-letters"),
    status: requireElement("hud-status"),
    gifts: requireElement("hud-gifts"),
  });

  let syncGuestbook = (): void => {};
  let presentGift: (gift: Gift | null) => void = () => {};

  const popup = new GiftPopup(
    {
      root: requireElement("gift-popup"),
      author: requireElement("popup-author"),
      message: requireElement("popup-message"),
      date: requireElement<HTMLTimeElement>("popup-date"),
      swatch: requireElement("popup-swatch"),
      tools: requireElement("popup-tools"),
      panel: requireElement("popup-panel"),
    },
    lifetime.signal,
    {
      onShow: (gift) => presentGift(gift),
      onHide: () => presentGift(null),
    },
  );

  const composer = new GiftComposer(
    {
      trigger: requireElement<HTMLButtonElement>("gift-button"),
      compose: requireElement<HTMLButtonElement>("guestbook-compose"),
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
    async (input, passcode) => {
      const wait = cooldown.remainingSeconds();
      if (wait > 0) throw new Error(`${wait}초 후에 다시 선물할 수 있어요.`);
      const gift = await giftRepository.create(input, passcode);
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
  const skipDraw = requireElement<HTMLButtonElement>("skip-draw");
  skipDraw.addEventListener(
    "click",
    () => {
      guestbookPrint.finish();
      typer.finish();
    },
    { signal: lifetime.signal },
  );

  const share = document.getElementById("share-tree");
  if (share instanceof HTMLButtonElement) {
    share.addEventListener(
      "click",
      () => {
        void shareTree(share);
      },
      { signal: lifetime.signal },
    );
  }

  bus.on("stage", (stage) => scene.activate(stage, clock.time));
  bus.on("complete", () => {
    completed = true;
    skipDraw.hidden = true;
    giftLayer.reveal(clock.time);
    if (features.rudolph) parade.start();
    hint.schedule(clock.time + 1.5 + giftLayer.count * 0.06);
    composer.setAvailable(true);
    syncGuestbook();
  });
  bus.on("reset", () => {
    clock.reset();
    scene.reset();
    typer.reset();
    effects.reset();
    santa.reset();
    snowman.reset();
    parade.reset();
    hint.reset();
    hoverLabel.show(null);
    giftLayer.reset();
    composer.setAvailable(false);
    completed = false;
    skipDraw.hidden = false;
    guestbookPrint.hide();
  });

  const pinned = [
    ...(features.santa ? [EASTER_GIFT] : []),
    ...(features.snowman ? [SNOWMAN_GIFT] : []),
  ];
  if (pinned.length > 0) giftLayer.addGifts(pinned, clock.time, "rise", { pinned: true, wobble: true });
  const entryLock = entryPasscode && giftApiUrl ? new EntryLockClient(giftApiUrl) : null;
  let refreshGuestbook = (): void => {};
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
      onClose: () => {
        if (!lifetime.signal.aborted) refreshGuestbook();
      },
      reply: async (input, passcode) => {
        const wait = cooldown.remainingSeconds();
        if (wait > 0) throw new Error(`${wait}초 후에 다시 남길 수 있어요.`);
        await replyRepository.create(input, passcode);
        cooldown.mark();
      },
      lock: entryLock
        ? {
            check: (kind, id, passcode) => entryLock.check(kind, id, passcode),
            update: async (id, author, message, passcode) => {
              await entryLock.update(id, author, message, passcode);
              giftLayer.replaceText(id, author, message);
              const next = giftLayer.guestbook().find((entry) => entry.gift.id === id)?.gift;
              if (next) popup.show(next);
              syncGuestbook();
            },
            remove: async (id, passcode) => {
              await entryLock.remove(id, passcode);
              giftLayer.forget(id);
              popup.close();
              syncGuestbook();
            },
            updateReply: async (id, author, message, passcode) => {
              await entryLock.updateReply(id, author, message, passcode);
              await giftRepository.list();
              syncGuestbook();
            },
            removeReply: async (id, passcode) => {
              await entryLock.removeReply(id, passcode);
              await giftRepository.list();
              syncGuestbook();
            },
          }
        : undefined,
    },
  );
  guestbook.bindPopup(requireElement("popup-tools"), requireElement("popup-panel"), lifetime.signal);
  presentGift = (gift) => {
    const known = gift !== null && giftLayer.guestbook().some((entry) => entry.gift.id === gift.id);
    guestbook.present(known ? gift : null);
  };
  syncGuestbook = () => {
    guestbook.render();
    if (completed) guestbookPrint.show(giftLayer.guestbook(), replyRepository.current());
  };

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
  refreshGuestbook = (): void => {
    const token = ++refreshToken;
    refreshButton.disabled = true;
    giftRepository
      .list()
      .then((gifts) => {
        if (token !== refreshToken) return;
        giftLayer.adopt(gifts, clock.time);
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

  const unbindControls = bindControls(canvas, {
    togglePause: () => clock.togglePause(),
    skip: () => typer.skipToNextStage(),
    restart: () => bus.emit("reset", undefined),
    rotate: (dx, dy) => camera.drag(dx, dy),
    zoom: (delta) => camera.nudgeZoom(delta),
    hover: (x, y) => {
      const gift = giftUnder(x, y);
      const catching = features.snowman && snowman.catchable && sprites.contains(SNOWMAN_SPRITE, x, y, 36);
      const sleigh = features.rudolph && sprites.contains(SLEIGH_SPRITE, x, y, 28);
      canvas.style.cursor = gift || catching || sleigh ? "pointer" : "";
      giftLayer.setHovered(gift?.id ?? null);
      hoverLabel.show(gift);
    },
    click: (x, y) => {
      if (features.rudolph && sprites.contains(SLEIGH_SPRITE, x, y, 28)) {
        popup.show(RUDOLPH_NOTE);
        return;
      }
      if (features.snowman && snowman.catchable && sprites.contains(SNOWMAN_SPRITE, x, y, 36)) {
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

  const updatables: readonly Updatable[] = [typer, guestbookPrint, scene, giftLayer, santa, snowman, hint, effects, camera, parade];

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
    const sourceMoved = editor.render(typer);
    guestbookPrint.syncLineNumbers();
    if (guestbookPrint.showing) {
      editor.releaseCaret();
      if (sourceMoved) guestbookPrint.followCaret();
    }
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

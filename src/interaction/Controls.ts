export interface ControlActions {
  togglePause(): void;
  skip(): void;
  restart(): void;
  rotate(dx: number, dy: number): void;
  /** Added to the camera zoom. Positive enlarges the tree. */
  zoom(delta: number): void;
  /** Coordinates are CSS pixels relative to the drag target. */
  click(x: number, y: number): void;
  hover(x: number, y: number): void;
}

const CLICK_TOLERANCE_PX = 5;

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/** Wires keyboard and pointer input to actions. Returns a disposer. */
export function bindControls(dragTarget: HTMLElement, actions: ControlActions): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || isEditable(event.target)) return;
    switch (event.code) {
      case "Space":
        event.preventDefault();
        actions.togglePause();
        break;
      case "ArrowRight":
        event.preventDefault();
        actions.skip();
        break;
      case "KeyR":
        actions.restart();
        break;    }
  };

  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let travelled = 0;
  let pinchDistance = 0;
  let pinched = false;

  const local = (event: PointerEvent): [number, number] => {
    const rect = dragTarget.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };

  const fingerSpan = (): number => {
    const [a, b] = pointers.values();
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const capture = (event: PointerEvent): void => {
    if (!event.isTrusted) return;
    dragTarget.setPointerCapture(event.pointerId);
  };

  const release = (event: PointerEvent): void => {
    if (dragTarget.hasPointerCapture(event.pointerId)) dragTarget.releasePointerCapture(event.pointerId);
  };

  const onPointerDown = (event: PointerEvent): void => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    capture(event);
    if (pointers.size === 1) {
      dragging = true;
      travelled = 0;
      return;
    }
    pinchDistance = fingerSpan();
    pinched = true;
    travelled = CLICK_TOLERANCE_PX;
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) {
      actions.hover(...local(event));
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const next = fingerSpan();
      if (pinchDistance > 0 && next > 0) actions.zoom(Math.log(next / pinchDistance));
      pinchDistance = next;
      return;
    }
    travelled += Math.abs(event.movementX) + Math.abs(event.movementY);
    actions.rotate(event.movementX, event.movementY);
  };
  const endPointer = (event: PointerEvent, click: boolean): void => {
    pointers.delete(event.pointerId);
    release(event);
    if (pointers.size >= 2) {
      pinchDistance = fingerSpan();
      return;
    }
    if (pointers.size === 1) {
      pinchDistance = 0;
      travelled = CLICK_TOLERANCE_PX;
      return;
    }
    if (click && dragging && !pinched && travelled < CLICK_TOLERANCE_PX) actions.click(...local(event));
    dragging = false;
    pinched = false;
    pinchDistance = 0;
  };
  const onPointerUp = (event: PointerEvent): void => endPointer(event, true);
  const onPointerCancel = (event: PointerEvent): void => endPointer(event, false);

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    actions.zoom(-event.deltaY * 0.001);
  };

  window.addEventListener("keydown", onKeyDown);
  dragTarget.addEventListener("pointerdown", onPointerDown);
  dragTarget.addEventListener("pointermove", onPointerMove);
  dragTarget.addEventListener("pointerup", onPointerUp);
  dragTarget.addEventListener("pointercancel", onPointerCancel);
  dragTarget.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    dragTarget.removeEventListener("pointerdown", onPointerDown);
    dragTarget.removeEventListener("pointermove", onPointerMove);
    dragTarget.removeEventListener("pointerup", onPointerUp);
    dragTarget.removeEventListener("pointercancel", onPointerCancel);
    dragTarget.removeEventListener("wheel", onWheel);
  };
}

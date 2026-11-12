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

  let dragging = false;
  let travelled = 0;

  const local = (event: PointerEvent): [number, number] => {
    const rect = dragTarget.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };

  const onPointerDown = (event: PointerEvent): void => {
    dragging = true;
    travelled = 0;
    dragTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (dragging) {
      travelled += Math.abs(event.movementX) + Math.abs(event.movementY);
      actions.rotate(event.movementX, event.movementY);
      return;
    }
    actions.hover(...local(event));
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (dragging && travelled < CLICK_TOLERANCE_PX) actions.click(...local(event));
    dragging = false;
    if (dragTarget.hasPointerCapture(event.pointerId)) dragTarget.releasePointerCapture(event.pointerId);
  };
  const onPointerCancel = (event: PointerEvent): void => {
    dragging = false;
    if (dragTarget.hasPointerCapture(event.pointerId)) dragTarget.releasePointerCapture(event.pointerId);
  };

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

import { PASSCODE_LIMITS, validatePasscode } from "../spaces/passcode";
import { GIFT_LIMITS, GIFT_PALETTE, GIFT_SHAPE_LABELS, type GiftShape, type NewGift } from "../gifts/Gift";
import type { GiftStyle } from "../gifts/style";
import { isGiftShape, validateNewGift } from "../gifts/validation";
import { Modal } from "./Modal";

export interface GiftComposerElements {
  readonly trigger: HTMLButtonElement;
  /** Second entry point, such as the guestbook list. Hidden with the corner button. */
  readonly compose?: HTMLButtonElement;
  readonly root: HTMLElement;
  readonly form: HTMLFormElement;
  readonly author: HTMLInputElement;
  readonly message: HTMLTextAreaElement;
  readonly counter: HTMLElement;
  /** Container of `name="gift-shape"` radio inputs. */
  readonly shapes: HTMLElement;
  /** Empty container filled with one radio chip per palette color. */
  readonly palette: HTMLElement;
  readonly randomColor: HTMLButtonElement;
  readonly swatch: HTMLElement;
  readonly sizeLabel: HTMLElement;
  readonly error: HTMLElement;
  readonly submit: HTMLButtonElement;
}

export type GiftSubmitHandler = (input: NewGift, passcode?: string) => Promise<void>;

const COLOR_INPUT_NAME = "gift-color";

/** "Leave a gift" form. The visitor picks shape and palette color; size stays random per opening. */
export class GiftComposer {
  private readonly modal: Modal;
  private shape: GiftShape = "box";
  private color: string;
  private size: number;
  private submitting = false;

  constructor(
    private readonly elements: GiftComposerElements,
    private readonly onSubmit: GiftSubmitHandler,
    private readonly rollStyle: () => GiftStyle,
    signal: AbortSignal,
  ) {
    this.modal = new Modal(elements.root, signal);
    ({ color: this.color, size: this.size } = rollStyle());
    elements.author.maxLength = GIFT_LIMITS.authorMax;
    elements.message.maxLength = GIFT_LIMITS.messageMax;
    this.renderPalette();

    const options = { signal };
    elements.trigger.addEventListener("click", () => this.open(), options);
    elements.compose?.addEventListener("click", () => this.open(), options);
    elements.message.addEventListener("input", () => this.updateCounter(), options);
    elements.shapes.addEventListener(
      "change",
      (event) => {
        const value = (event.target as HTMLInputElement).value;
        if (isGiftShape(value)) this.shape = value;
        this.updatePreview();
      },
      options,
    );
    elements.palette.addEventListener(
      "change",
      (event) => {
        this.color = (event.target as HTMLInputElement).value;
        this.updatePreview();
      },
      options,
    );
    elements.randomColor.addEventListener("click", () => this.selectColor(this.rollStyle().color), options);
    elements.form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        void this.submit();
      },
      options,
    );
    signal.addEventListener("abort", () => (elements.trigger.hidden = true), { once: true });
  }

  setAvailable(available: boolean): void {
    this.elements.trigger.hidden = !available;
    if (this.elements.compose) this.elements.compose.hidden = !available;
    if (!available) this.modal.close();
  }

  private renderPalette(): void {
    const chips = GIFT_PALETTE.map((color, index) => {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = COLOR_INPUT_NAME;
      input.value = color;
      input.setAttribute("aria-label", `색상 ${index + 1}`);
      const dot = document.createElement("span");
      dot.style.background = color;
      const chip = document.createElement("label");
      chip.className = "color-chip";
      chip.append(input, dot);
      return chip;
    });
    this.elements.palette.replaceChildren(...chips);
  }

  private open(): void {
    const style = this.rollStyle();
    this.size = style.size;
    this.selectColor(style.color);
    this.setError("");
    this.updateCounter();
    this.modal.open();
    this.elements.author.focus();
  }

  private selectColor(color: string): void {
    this.color = color;
    for (const input of this.elements.palette.querySelectorAll<HTMLInputElement>(`input[name="${COLOR_INPUT_NAME}"]`)) {
      input.checked = input.value === color;
    }
    this.updatePreview();
  }

  private updatePreview(): void {
    const { swatch, sizeLabel } = this.elements;
    swatch.style.backgroundColor = this.color;
    swatch.classList.toggle("is-ornament", this.shape === "ornament");
    sizeLabel.textContent = `${GIFT_SHAPE_LABELS[this.shape]} · size ${this.size.toFixed(2)}`;
  }

  private async submit(): Promise<void> {
    if (this.submitting) return;
    const result = validateNewGift({
      author: this.elements.author.value,
      message: this.elements.message.value,
      shape: this.shape,
      color: this.color,
      size: this.size,
    });
    if (!result.ok) {
      this.setError(result.error);
      return;
    }
    const passcode = this.passcode();
    if (!passcode.ok) {
      this.setError(passcode.error);
      return;
    }

    this.submitting = true;
    this.elements.submit.disabled = true;
    this.setError("");
    try {
      await this.onSubmit(result.value, passcode.value);
      this.elements.message.value = "";
      const field = document.getElementById("gift-passcode");
      if (field instanceof HTMLInputElement) field.value = "";
      this.modal.close();
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "선물을 남기지 못했습니다.");
    } finally {
      this.submitting = false;
      this.elements.submit.disabled = false;
    }
  }

  private updateCounter(): void {
    this.elements.counter.textContent = `${this.elements.message.value.length}/${GIFT_LIMITS.messageMax}`;
  }

  private passcode(): { ok: true; value: string | undefined } | { ok: false; error: string } {
    const field = document.getElementById("gift-passcode");
    if (!(field instanceof HTMLInputElement)) return { ok: true, value: undefined };
    field.maxLength = PASSCODE_LIMITS.max;
    const result = validatePasscode(field.value);
    if (!result.ok) return result;
    return { ok: true, value: result.value };
  }

  private setError(message: string): void {
    this.elements.error.textContent = message;
  }
}

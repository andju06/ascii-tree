import type { Gift } from "../gifts/Gift";
import { Modal } from "./Modal";

export interface GiftPopupElements {
  readonly root: HTMLElement;
  readonly author: HTMLElement;
  readonly message: HTMLElement;
  readonly date: HTMLTimeElement;
  readonly swatch: HTMLElement;
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

export class GiftPopup {
  private readonly modal: Modal;

  constructor(
    private readonly elements: GiftPopupElements,
    signal: AbortSignal,
  ) {
    this.modal = new Modal(elements.root, signal);
  }

  show(gift: Gift): void {
    const { author, message, date, swatch } = this.elements;
    author.textContent = gift.author;
    message.textContent = gift.message;
    date.dateTime = gift.createdAt;
    date.textContent = dateFormat.format(new Date(gift.createdAt));
    swatch.style.background = gift.color;
    swatch.classList.toggle("is-ornament", gift.shape === "ornament");
    this.modal.open();
  }
}

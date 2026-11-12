import type { Gift } from "../gifts/Gift";
import { Modal } from "./Modal";

export interface GuestbookEntry {
  readonly gift: Gift;
  readonly opened: boolean;
}

export interface GuestbookListElements {
  readonly root: HTMLElement;
  readonly list: HTMLElement;
  readonly empty: HTMLElement;
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

/** Newest-first list of guestbook messages. Choosing a row marks it read. */
export class GuestbookList {
  private readonly modal: Modal;

  constructor(
    private readonly elements: GuestbookListElements,
    signal: AbortSignal,
    private readonly entries: () => readonly GuestbookEntry[],
    private readonly onRead: (id: string) => void,
  ) {
    this.modal = new Modal(elements.root, signal);
    elements.list.addEventListener(
      "click",
      (event) => {
        const row = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-gift-id]");
        if (!row) return;
        this.onRead(row.dataset.giftId ?? "");
        this.render();
      },
      { signal },
    );
  }

  open(): void {
    this.render();
    this.modal.open();
  }

  render(): void {
    const items = this.entries();
    const fragment = document.createDocumentFragment();
    for (const entry of items) fragment.append(this.row(entry));
    this.elements.list.replaceChildren(fragment);
    this.elements.empty.hidden = items.length > 0;
  }

  private row({ gift, opened }: GuestbookEntry): HTMLLIElement {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guestbook-item";
    button.dataset.giftId = gift.id;

    const swatch = document.createElement("span");
    swatch.className = gift.shape === "ornament" ? "swatch is-ornament" : "swatch";
    swatch.style.background = gift.color;

    const body = document.createElement("span");
    body.className = "guestbook-body";

    const meta = document.createElement("span");
    meta.className = "guestbook-meta";
    const author = document.createElement("strong");
    author.textContent = gift.author;
    const time = document.createElement("time");
    time.dateTime = gift.createdAt;
    time.textContent = dateFormat.format(new Date(gift.createdAt));
    meta.append(author, time);
    if (!opened) {
      const heart = document.createElement("span");
      heart.className = "guestbook-heart";
      heart.textContent = "♥";
      meta.append(heart);
    }

    const message = document.createElement("span");
    message.className = "guestbook-message";
    message.textContent = gift.message;

    body.append(meta, message);
    button.append(swatch, body);
    item.append(button);
    return item;
  }
}

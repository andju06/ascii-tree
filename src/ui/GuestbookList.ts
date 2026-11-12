import type { Gift } from "../gifts/Gift";
import { REPLY_LIMITS, type NewReply, type Reply } from "../replies/Reply";
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

export interface GuestbookActions {
  entries(): readonly GuestbookEntry[];
  replies(): readonly Reply[];
  isReplyRead(id: string): boolean;
  readGift(id: string): void;
  readReply(id: string): void;
  reply(input: NewReply): Promise<void>;
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

/** Newest-first guestbook. Replies sit under their post, oldest first, and never become tree gifts. */
export class GuestbookList {
  private readonly modal: Modal;
  private draftParent: string | null = null;
  private draftAuthor = "";
  private draftMessage = "";
  private draftError = "";
  private sending = false;

  constructor(
    private readonly elements: GuestbookListElements,
    signal: AbortSignal,
    private readonly actions: GuestbookActions,
  ) {
    this.modal = new Modal(elements.root, signal);
    elements.list.addEventListener("click", (event) => this.onClick(event), { signal });
    elements.list.addEventListener("input", (event) => this.onInput(event), { signal });
    elements.list.addEventListener("submit", (event) => void this.onSubmit(event), { signal });
  }

  open(): void {
    this.render();
    this.modal.open();
  }

  render(): void {
    const active = document.activeElement;
    const fieldName = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active.name : "";
    const items = this.actions.entries();
    const replies = this.actions.replies();
    const fragment = document.createDocumentFragment();
    for (const entry of items) fragment.append(this.entry(entry, replies));
    this.elements.list.replaceChildren(fragment);
    this.elements.empty.hidden = items.length > 0;
    if (!fieldName || this.draftParent === null) return;
    const form = this.elements.list.querySelector("form");
    const next = form?.elements.namedItem(fieldName);
    if (next instanceof HTMLElement) next.focus();
  }

  private onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const replyRow = target.closest<HTMLElement>("[data-reply-id]");
    if (replyRow) {
      this.actions.readReply(replyRow.dataset.replyId ?? "");
      this.render();
      return;
    }

    const toggle = target.closest<HTMLButtonElement>("[data-reply-toggle]");
    if (toggle) {
      const parentId = toggle.dataset.replyToggle ?? "";
      this.draftParent = this.draftParent === parentId ? null : parentId;
      this.draftError = "";
      this.render();
      return;
    }

    if (target.closest("form")) return;
    const giftRow = target.closest<HTMLElement>("[data-gift-id]");
    if (!giftRow) return;
    this.actions.readGift(giftRow.dataset.giftId ?? "");
    this.render();
  }

  private onInput(event: Event): void {
    const form = event.target instanceof Element ? event.target.closest("form") : null;
    if (!form) return;
    const author = form.elements.namedItem("author");
    const message = form.elements.namedItem("message");
    this.draftAuthor = author instanceof HTMLInputElement ? author.value : "";
    this.draftMessage = message instanceof HTMLTextAreaElement ? message.value : "";
    const counter = form.querySelector("[data-reply-counter]");
    if (counter) counter.textContent = `${this.draftMessage.length}/${REPLY_LIMITS.messageMax}`;
  }

  private async onSubmit(event: Event): Promise<void> {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (this.sending || this.draftParent === null) return;

    const parentId = this.draftParent;
    const author = form.elements.namedItem("author");
    const message = form.elements.namedItem("message");
    const authorValue = author instanceof HTMLInputElement ? author.value : this.draftAuthor;
    const messageValue = message instanceof HTMLTextAreaElement ? message.value : this.draftMessage;
    this.sending = true;
    this.draftError = "";
    this.render();
    try {
      await this.actions.reply({ parentId, author: authorValue, message: messageValue });
      if (this.draftParent === parentId) {
        this.draftParent = null;
        this.draftAuthor = "";
        this.draftMessage = "";
        this.draftError = "";
      }
    } catch (error) {
      this.draftError = error instanceof Error ? error.message : "답글을 남기지 못했습니다.";
    } finally {
      this.sending = false;
      this.render();
    }
  }

  private entry(entry: GuestbookEntry, replies: readonly Reply[]): HTMLLIElement {
    const item = document.createElement("li");
    item.className = "guestbook-entry";
    const card = document.createElement("div");
    card.className = "guestbook-card";
    card.append(this.giftButton(entry), this.thread(entry.gift.id, replies));
    item.append(card);
    return item;
  }

  private giftButton({ gift, opened }: GuestbookEntry): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guestbook-item";
    button.dataset.giftId = gift.id;

    const swatch = document.createElement("span");
    swatch.className = gift.shape === "ornament" ? "swatch is-ornament" : "swatch";
    swatch.style.backgroundColor = gift.color;

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
    return button;
  }

  private thread(parentId: string, replies: readonly Reply[]): HTMLDivElement {
    const thread = document.createElement("div");
    thread.className = "guestbook-thread";
    const mine = replies.filter((reply) => reply.parentId === parentId);

    if (mine.length >= REPLY_LIMITS.perParent) {
      const full = document.createElement("p");
      full.className = "reply-full";
      full.textContent = "답글이 가득 찼습니다.";
      thread.append(full);
    } else {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "reply-toggle";
      toggle.dataset.replyToggle = parentId;
      toggle.textContent = "답글";
      thread.append(toggle);
      if (this.draftParent === parentId) thread.append(this.form());
    }

    if (mine.length > 0) {
      const list = document.createElement("ul");
      list.className = "reply-list";
      for (const reply of mine) list.append(this.replyRow(reply));
      thread.append(list);
    }

    return thread;
  }

  private replyRow(reply: Reply): HTMLLIElement {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reply-item";
    button.dataset.replyId = reply.id;

    const meta = document.createElement("span");
    meta.className = "guestbook-meta";
    const author = document.createElement("strong");
    author.textContent = reply.author;
    const time = document.createElement("time");
    time.dateTime = reply.createdAt;
    time.textContent = dateFormat.format(new Date(reply.createdAt));
    meta.append(author, time);
    if (!this.actions.isReplyRead(reply.id)) {
      const dot = document.createElement("span");
      dot.className = "reply-dot";
      dot.setAttribute("aria-label", "새 답글");
      meta.append(dot);
    }

    const message = document.createElement("span");
    message.className = "guestbook-message";
    message.textContent = reply.message;

    button.append(meta, message);
    item.append(button);
    return item;
  }

  private form(): HTMLFormElement {
    const form = document.createElement("form");
    form.className = "reply-form";
    form.noValidate = true;

    const author = document.createElement("label");
    author.className = "field";
    const authorLabel = document.createElement("span");
    authorLabel.textContent = "닉네임";
    const authorInput = document.createElement("input");
    authorInput.name = "author";
    authorInput.maxLength = REPLY_LIMITS.authorMax;
    authorInput.required = true;
    authorInput.value = this.draftAuthor;
    author.append(authorLabel, authorInput);

    const message = document.createElement("label");
    message.className = "field";
    const messageLabel = document.createElement("span");
    messageLabel.textContent = "메시지";
    const messageInput = document.createElement("textarea");
    messageInput.name = "message";
    messageInput.maxLength = REPLY_LIMITS.messageMax;
    messageInput.rows = 2;
    messageInput.required = true;
    messageInput.value = this.draftMessage;
    message.append(messageLabel, messageInput);

    const row = document.createElement("span");
    row.className = "field-row";
    const error = document.createElement("span");
    error.className = "error";
    error.textContent = this.draftError;
    const counter = document.createElement("span");
    counter.dataset.replyCounter = "";
    counter.textContent = `${this.draftMessage.length}/${REPLY_LIMITS.messageMax}`;
    row.append(error, counter);

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn primary small";
    submit.textContent = "남기기";
    submit.disabled = this.sending;

    form.append(author, message, row, submit);
    return form;
  }
}

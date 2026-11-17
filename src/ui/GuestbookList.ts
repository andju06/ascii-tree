import type { Gift } from "../gifts/Gift";
import { GIFT_LIMITS } from "../gifts/Gift";
import { validateGiftText } from "../gifts/validation";
import { REPLY_LIMITS, type NewReply, type Reply } from "../replies/Reply";
import { validateReplyText } from "../replies/validation";
import { PASSCODE_LIMITS, validatePasscode } from "../spaces/passcode";
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
  reply(input: NewReply, passcode?: string): Promise<void>;
  /** Runs after the list closes, so the tree can pick up anything that changed. */
  onClose?(): void;
  /** Present only on a personal tree, where each entry has its own password. */
  lock?: {
    check(kind: "gift" | "reply", id: string, passcode: string): Promise<void>;
    update(id: string, author: string, message: string, passcode: string): Promise<void>;
    remove(id: string, passcode: string): Promise<void>;
    updateReply(id: string, author: string, message: string, passcode: string): Promise<void>;
    removeReply(id: string, passcode: string): Promise<void>;
  };
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
  private editingId: string | null = null;
  private deletingId: string | null = null;
  private lockAuthor = "";
  private lockMessage = "";
  private lockPasscode = "";
  private lockError = "";
  private lockKind: "gift" | "reply" = "gift";
  private lockOpen = false;
  private draftPasscode = "";
  private popupGift: Gift | null = null;
  private popupTools: HTMLElement | null = null;
  private popupPanel: HTMLElement | null = null;

  constructor(
    private readonly elements: GuestbookListElements,
    signal: AbortSignal,
    private readonly actions: GuestbookActions,
  ) {
    this.modal = new Modal(elements.root, signal, () => {
      this.clearDraft();
      this.render();
      this.actions.onClose?.();
    });
    elements.list.addEventListener("click", (event) => this.onClick(event), { signal });
    elements.list.addEventListener("input", (event) => this.onInput(event), { signal });
    elements.list.addEventListener("submit", (event) => void this.onSubmit(event), { signal });
  }

  bindPopup(tools: HTMLElement, panel: HTMLElement, signal: AbortSignal): void {
    this.popupTools = tools;
    this.popupPanel = panel;
    tools.addEventListener("click", (event) => this.onClick(event), { signal });
    panel.addEventListener("click", (event) => this.onClick(event), { signal });
    panel.addEventListener("input", (event) => this.onInput(event), { signal });
    panel.addEventListener("submit", (event) => void this.onSubmit(event), { signal });
  }

  present(gift: Gift | null): void {
    this.popupGift = gift;
    this.paintPopup();
  }

  open(): void {
    this.render();
    this.modal.open();
  }

  /** Drops reply, edit, and delete forms so the next open starts clean. */
  private clearDraft(): void {
    this.draftParent = null;
    this.draftAuthor = "";
    this.draftMessage = "";
    this.draftError = "";
    this.draftPasscode = "";
    this.editingId = null;
    this.deletingId = null;
    this.lockAuthor = "";
    this.lockMessage = "";
    this.lockPasscode = "";
    this.lockError = "";
    this.lockKind = "gift";
    this.lockOpen = false;
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
    this.paintPopup();
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

    const edit = target.closest<HTMLButtonElement>("[data-edit]");
    if (edit) {
      const id = edit.dataset.edit ?? "";
      this.lockKind = edit.dataset.kind === "reply" ? "reply" : "gift";
      this.editingId = this.editingId === id ? null : id;
      this.deletingId = null;
      this.lockOpen = false;
      this.fillLockText(id);
      this.lockPasscode = "";
      this.lockError = "";
      this.render();
      return;
    }

    const remove = target.closest<HTMLButtonElement>("[data-delete]");
    if (remove) {
      const id = remove.dataset.delete ?? "";
      this.lockKind = remove.dataset.kind === "reply" ? "reply" : "gift";
      this.deletingId = this.deletingId === id ? null : id;
      this.editingId = null;
      this.lockOpen = false;
      this.lockPasscode = "";
      this.lockError = "";
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
    const passcode = form.elements.namedItem("passcode");
    if (form.dataset.lock) {
      if (passcode instanceof HTMLInputElement) this.lockPasscode = passcode.value;
      if (form.dataset.lock === "edit") {
        const author = form.elements.namedItem("author");
        const message = form.elements.namedItem("message");
        if (author instanceof HTMLInputElement) this.lockAuthor = author.value;
        if (message instanceof HTMLTextAreaElement) this.lockMessage = message.value;
      }
      return;
    }

    const author = form.elements.namedItem("author");
    const message = form.elements.namedItem("message");
    if (author instanceof HTMLInputElement) this.draftAuthor = author.value;
    if (message instanceof HTMLTextAreaElement) this.draftMessage = message.value;
    if (passcode instanceof HTMLInputElement) this.draftPasscode = passcode.value;
    const counter = form.querySelector("[data-reply-counter]");
    if (counter) counter.textContent = `${this.draftMessage.length}/${REPLY_LIMITS.messageMax}`;
  }

  private async onSubmit(event: Event): Promise<void> {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.dataset.lock === "edit" || form.dataset.lock === "delete") {
      await this.submitLock(form.dataset.lock);
      return;
    }
    if (this.sending || this.draftParent === null) return;

    const parentId = this.draftParent;
    const author = form.elements.namedItem("author");
    const message = form.elements.namedItem("message");
    const authorValue = author instanceof HTMLInputElement ? author.value : this.draftAuthor;
    const messageValue = message instanceof HTMLTextAreaElement ? message.value : this.draftMessage;
    const passcodeField = form.elements.namedItem("passcode");
    const passcodeValue = passcodeField instanceof HTMLInputElement ? passcodeField.value : this.draftPasscode;
    this.sending = true;
    this.draftError = "";
    this.render();
    try {
      const passcode = this.actions.lock ? validatePasscode(passcodeValue) : { ok: true as const, value: undefined };
      if (!passcode.ok) throw new Error(passcode.error);
      await this.actions.reply({ parentId, author: authorValue, message: messageValue }, passcode.value);
      if (this.draftParent === parentId) {
        this.draftParent = null;
        this.draftAuthor = "";
        this.draftMessage = "";
        this.draftPasscode = "";
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
    const head = document.createElement("div");
    head.className = "guestbook-head";
    head.append(this.giftButton(entry));
    const action = this.replyAction(entry.gift.id, replies);
    if (action) head.append(action);
    const tools = this.lockTools(entry.gift.id);
    if (tools) head.append(tools);
    const thread = this.thread(entry.gift.id, replies);
    const lockForm = this.lockForm(entry.gift.id);
    card.append(head);
    if (lockForm) card.append(lockForm);
    if (thread.childElementCount > 0) card.append(thread);
    item.append(card);
    return item;
  }

  private lockTools(id: string): HTMLElement | null {
    if (!this.actions.lock) return null;
    const tools = document.createElement("span");
    tools.className = "entry-tools";
    const edit = iconButton("수정", "edit");
    edit.dataset.edit = id;
    const remove = iconButton("삭제", "delete");
    remove.dataset.delete = id;
    tools.append(edit, remove);
    return tools;
  }

  private lockForm(id: string): HTMLFormElement | null {
    if (!this.actions.lock) return null;
    if (this.editingId !== id && this.deletingId !== id) return null;
    const editing = this.editingId === id;
    const form = document.createElement("form");
    form.className = "reply-form";
    form.noValidate = true;
    form.dataset.lock = editing ? "edit" : "delete";

    if (editing && this.lockOpen) {
      form.append(this.lockField("닉네임", "author", this.lockAuthor), this.lockField("메시지", "message", this.lockMessage));
    } else {
      form.append(this.lockField("비밀번호", "passcode", this.lockPasscode));
    }

    const error = document.createElement("span");
    error.className = "error";
    error.textContent = this.lockError;

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn primary small";
    submit.textContent = editing ? (this.lockOpen ? "저장" : "확인") : "삭제";
    submit.disabled = this.sending;

    form.append(error, submit);
    return form;
  }

  private lockField(label: string, name: string, value: string): HTMLLabelElement {
    const field = document.createElement("label");
    field.className = "field";
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.name = name;
    input.value = value;
    input.required = true;
    if (name === "passcode") {
      input.type = "password";
      input.maxLength = PASSCODE_LIMITS.max;
      input.autocomplete = "off";
    } else if (name === "message") {
      const message = document.createElement("textarea");
      message.name = name;
      message.value = value;
      message.required = true;
      message.rows = 3;
      message.maxLength = this.lockKind === "reply" ? REPLY_LIMITS.messageMax : GIFT_LIMITS.messageMax;
      field.append(caption, message);
      return field;
    } else {
      input.maxLength = GIFT_LIMITS.authorMax;
    }
    field.append(caption, input);
    return field;
  }

  private async submitLock(mode: "edit" | "delete"): Promise<void> {
    const lock = this.actions.lock;
    const id = mode === "edit" ? this.editingId : this.deletingId;
    if (!lock || !id || this.sending) return;

    const passcode = validatePasscode(this.lockPasscode);
    if (!passcode.ok) {
      this.lockError = passcode.error;
      this.render();
      return;
    }

    this.sending = true;
    this.lockError = "";
    this.render();
    try {
      if (mode === "delete") {
        if (this.lockKind === "reply") await lock.removeReply(id, passcode.value);
        else await lock.remove(id, passcode.value);
      } else if (!this.lockOpen) {
        await lock.check(this.lockKind, id, passcode.value);
        this.lockOpen = true;
        this.fillLockText(id);
        return;
      } else if (this.lockKind === "reply") {
        const text = validateReplyText({ author: this.lockAuthor, message: this.lockMessage });
        if (!text.ok) throw new Error(text.error);
        await lock.updateReply(id, text.value.author, text.value.message, passcode.value);
      } else {
        const text = validateGiftText({ author: this.lockAuthor, message: this.lockMessage });
        if (!text.ok) throw new Error(text.error);
        await lock.update(id, text.value.author, text.value.message, passcode.value);
      }
      this.editingId = null;
      this.deletingId = null;
      this.lockOpen = false;
      this.lockPasscode = "";
      this.lockError = "";
    } catch (error) {
      this.lockError = error instanceof Error ? error.message : "처리하지 못했습니다.";
    } finally {
      this.sending = false;
      this.render();
    }
  }

  private giftButton({ gift }: GuestbookEntry): HTMLButtonElement {
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

    const message = document.createElement("span");
    message.className = "guestbook-message";
    message.textContent = gift.message;

    body.append(meta, message);
    button.append(swatch, body);
    return button;
  }

  private replyAction(parentId: string, replies: readonly Reply[]): HTMLElement | null {
    const mine = replies.filter((reply) => reply.parentId === parentId);
    if (mine.length >= REPLY_LIMITS.perParent) {
      const full = document.createElement("p");
      full.className = "reply-full";
      full.textContent = "답글이 가득 찼습니다.";
      return full;
    }
    const toggle = iconButton("답글", "reply");
    toggle.dataset.replyToggle = parentId;
    return toggle;
  }

  private thread(parentId: string, replies: readonly Reply[]): HTMLDivElement {
    const thread = document.createElement("div");
    thread.className = "guestbook-thread";
    const mine = replies.filter((reply) => reply.parentId === parentId);
    if (mine.length < REPLY_LIMITS.perParent && this.draftParent === parentId) thread.append(this.form());

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

    const message = document.createElement("span");
    message.className = "guestbook-message";
    message.textContent = reply.message;

    button.append(meta, message);
    if (!this.actions.lock) {
      item.append(button);
      return item;
    }
    const line = document.createElement("div");
    line.className = "reply-line";
    const edit = iconButton("수정", "edit");
    edit.dataset.edit = reply.id;
    edit.dataset.kind = "reply";
    const remove = iconButton("삭제", "delete");
    remove.dataset.delete = reply.id;
    remove.dataset.kind = "reply";
    const tools = document.createElement("span");
    tools.className = "entry-tools";
    tools.append(edit, remove);
    line.append(button, tools);
    item.append(line);
    const lockForm = this.lockForm(reply.id);
    if (lockForm) item.append(lockForm);
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
    form.append(author, message);
    if (this.actions.lock) form.append(this.lockField("비밀번호", "passcode", this.draftPasscode));

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

    form.append(row, submit);
    return form;
  }

  private fillLockText(id: string): void {
    if (this.lockKind === "reply") {
      const reply = this.actions.replies().find((item) => item.id === id);
      this.lockAuthor = reply?.author ?? "";
      this.lockMessage = reply?.message ?? "";
      return;
    }
    const gift = this.actions.entries().find((entry) => entry.gift.id === id)?.gift;
    this.lockAuthor = gift?.author ?? "";
    this.lockMessage = gift?.message ?? "";
  }

  private paintPopup(): void {
    const tools = this.popupTools;
    const panel = this.popupPanel;
    if (!tools || !panel) return;
    const gift = this.popupGift;
    if (!gift || !this.actions.lock) {
      tools.hidden = true;
      tools.replaceChildren();
      panel.replaceChildren();
      return;
    }
    tools.hidden = false;
    const reply = iconButton("답글", "reply");
    reply.dataset.replyToggle = gift.id;
    const edit = iconButton("수정", "edit");
    edit.dataset.edit = gift.id;
    edit.dataset.kind = "gift";
    const remove = iconButton("삭제", "delete");
    remove.dataset.delete = gift.id;
    remove.dataset.kind = "gift";
    const replies = this.actions.replies().filter((item) => item.parentId === gift.id);
    const full = replies.length >= REPLY_LIMITS.perParent;
    tools.replaceChildren();
    if (!full) tools.append(reply);
    tools.append(edit, remove);

    const fragment = document.createDocumentFragment();
    if (!full && this.draftParent === gift.id) fragment.append(this.form());
    const lock = this.lockForm(gift.id);
    if (lock) fragment.append(lock);
    if (replies.length > 0) {
      const list = document.createElement("ul");
      list.className = "reply-list";
      for (const item of replies) list.append(this.replyRow(item));
      fragment.append(list);
    }
    panel.replaceChildren(fragment);
  }
}

const ICONS = {
  reply: ["M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"],
  delete: ["M4 7h16", "M9 7V5h6v2", "M7 7l1 13h8l1-13"],
} as const;

function iconButton(label: string, icon: keyof typeof ICONS): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "entry-icon";
  button.setAttribute("aria-label", label);
  button.title = label;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of ICONS[icon]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  button.append(svg);
  return button;
}

import type { Updatable } from "../core/types";
import type { Gift } from "../gifts/Gift";
import type { Reply } from "../replies/Reply";
import { compareReplies } from "../replies/validation";
import type { Highlighter } from "./SyntaxHighlighter";

export interface PrintedEntry {
  readonly gift: Gift;
}

const CHARS_PER_SECOND = 140;
const LINE_PAUSE = 0.12;
const CARET = '<span class="caret"></span>';

/** Guestbook printed under the typed source, one character at a time, as note().reply() calls. */
export class GuestbookPrint implements Updatable {
  private target = "";
  private cursor = 0;
  private wait = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly highlighter: Highlighter,
  ) {}

  show(entries: readonly PrintedEntry[], replies: readonly Reply[]): void {
    const next = this.script(entries, replies);
    const typed = this.target.slice(0, this.cursor);
    let common = 0;
    const limit = Math.min(typed.length, next.length);
    while (common < limit && typed[common] === next[common]) common++;
    const changed = next !== this.target;
    this.target = next;
    this.root.hidden = false;
    if (!changed) return;
    if (common < this.cursor) this.cursor = common;
    this.paint();
  }

  update(dt: number): void {
    if (this.root.hidden || this.cursor >= this.target.length) return;
    this.wait -= dt;
    let typed = false;
    while (this.wait <= 0 && this.cursor < this.target.length) {
      const char = this.target[this.cursor];
      this.cursor += 1;
      typed = true;
      this.wait += char === "\n" ? LINE_PAUSE : 1 / CHARS_PER_SECOND;
    }
    if (!typed) return;
    this.paint();
  }

  hide(): void {
    this.target = "";
    this.cursor = 0;
    this.wait = 0;
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  private script(entries: readonly PrintedEntry[], replies: readonly Reply[]): string {
    const lines: string[] = [];
    for (const { gift } of [...entries].reverse()) {
      const mine = replies.filter((reply) => reply.parentId === gift.id).sort(compareReplies);
      const head = `note(${quote(gift.author)}, ${quote(gift.message)})`;
      if (mine.length === 0) {
        lines.push(`${head};`);
        continue;
      }
      lines.push(head);
      mine.forEach((reply, index) => {
        const end = index === mine.length - 1 ? ";" : "";
        lines.push(`  .reply(${quote(reply.author)}, ${quote(reply.message)})${end}`);
      });
    }
    return lines.join("\n");
  }

  private paint(): void {
    const text = this.target.slice(0, this.cursor);
    const parts = text.length === 0 ? [] : text.split("\n");
    const typing = this.cursor < this.target.length;
    this.root.replaceChildren(
      ...parts.map((part, index) => this.line(part, typing && index === parts.length - 1)),
    );
    this.stamp();
    this.revealCaret();
  }

  private line(text: string, caret: boolean): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "line";
    const gutter = document.createElement("span");
    gutter.className = "gutter";
    const code = document.createElement("span");
    code.className = "code";
    code.innerHTML = this.highlighter.highlight(text) + (caret ? CARET : "");
    row.append(gutter, code);
    return row;
  }

  /** Continues the source line numbers. Source lines can land later in the same frame. */
  private stamp(): void {
    const start = this.root.parentElement?.querySelectorAll(":scope > .line").length ?? 0;
    this.root.querySelectorAll(".gutter").forEach((gutter, index) => {
      gutter.textContent = String(start + index + 1);
    });
  }

  private revealCaret(): void {
    const scroller = this.root.parentElement;
    const line = this.root.lastElementChild;
    if (!scroller || !(line instanceof HTMLElement)) return;
    const top = line.offsetTop;
    const bottom = top + line.offsetHeight;
    if (top < scroller.scrollTop) scroller.scrollTop = top;
    else if (bottom > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTop = bottom - scroller.clientHeight;
    }
  }
}

function quote(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return `"${escaped}"`;
}

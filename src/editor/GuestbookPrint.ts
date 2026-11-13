import type { Gift } from "../gifts/Gift";
import type { Reply } from "../replies/Reply";
import { compareReplies } from "../replies/validation";
import type { Highlighter } from "./SyntaxHighlighter";

export interface PrintedEntry {
  readonly gift: Gift;
}

/** Guestbook printed under the typed source as note().reply() calls. */
export class GuestbookPrint {
  constructor(
    private readonly root: HTMLElement,
    private readonly highlighter: Highlighter,
  ) {}

  show(entries: readonly PrintedEntry[], replies: readonly Reply[]): void {
    const scroller = this.root.parentElement;
    const follow = scroller !== null && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
    this.root.hidden = false;
    this.root.replaceChildren();
    const chronological = [...entries].reverse();
    for (const { gift } of chronological) {
      const mine = replies.filter((reply) => reply.parentId === gift.id).sort(compareReplies);
      for (const row of this.entry(gift, mine)) this.root.append(row);
    }
    this.stamp();
    requestAnimationFrame(() => {
      if (!this.root.hidden) this.stamp();
    });
    if (follow && scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  hide(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  private entry(gift: Gift, replies: readonly Reply[]): HTMLDivElement[] {
    const head = `note(${quote(gift.author)}, ${quote(gift.message)})`;
    if (replies.length === 0) return [this.line(`${head};`)];
    const lines = [this.line(head)];
    replies.forEach((reply, index) => {
      const end = index === replies.length - 1 ? ";" : "";
      lines.push(this.line(`  .reply(${quote(reply.author)}, ${quote(reply.message)})${end}`));
    });
    return lines;
  }

  private line(text: string): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "line";
    const gutter = document.createElement("span");
    gutter.className = "gutter";
    const code = document.createElement("span");
    code.className = "code";
    code.innerHTML = this.highlighter.highlight(text);
    row.append(gutter, code);
    return row;
  }

  /** Continues the source line numbers. The typed lines land in the same frame, so stamp again next frame. */
  private stamp(): void {
    const start = this.root.parentElement?.querySelectorAll(":scope > .line").length ?? 0;
    this.root.querySelectorAll(".gutter").forEach((gutter, index) => {
      gutter.textContent = String(start + index + 1);
    });
  }
}

function quote(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return `"${escaped}"`;
}

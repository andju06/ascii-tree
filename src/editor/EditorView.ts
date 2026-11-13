import type { Highlighter } from "./SyntaxHighlighter";
import type { TypingSource } from "./Typer";

interface EditorLine {
  readonly root: HTMLDivElement;
  readonly code: HTMLSpanElement;
  text: string;
}

const CARET = '<span class="caret"></span>';

/** Renders typed source incrementally: only the active line is re-highlighted per frame. */
export class EditorView {
  private readonly lines: EditorLine[] = [];
  private renderedCursor = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly highlighter: Highlighter,
  ) {
    this.container.replaceChildren(...this.kept());
  }

  render(source: TypingSource): void {
    if (source.cursor < this.renderedCursor) this.clear();
    if (this.lines.length === 0) this.appendLine();
    if (source.cursor === this.renderedCursor) return;

    const chunk = source.text.slice(this.renderedCursor, source.cursor);
    this.renderedCursor = source.cursor;
    for (const char of chunk) {
      if (char === "\n") {
        this.commitCurrentLine();
        this.appendLine();
      } else {
        this.currentLine.text += char;
      }
    }
    this.currentLine.code.innerHTML = this.highlighter.highlight(this.currentLine.text) + CARET;
    this.scrollToCurrentLine();
  }

  private get currentLine(): EditorLine {
    return this.lines[this.lines.length - 1];
  }

  private appendLine(): void {
    const root = document.createElement("div");
    root.className = "line active";
    const gutter = document.createElement("span");
    gutter.className = "gutter";
    gutter.textContent = String(this.lines.length + 1);
    const code = document.createElement("span");
    code.className = "code";
    code.innerHTML = CARET;
    root.append(gutter, code);
    const anchor = this.container.querySelector("[data-keep]");
    if (anchor) this.container.insertBefore(root, anchor);
    else this.container.append(root);
    this.lines.push({ root, code, text: "" });
  }

  private commitCurrentLine(): void {
    const line = this.currentLine;
    line.code.innerHTML = this.highlighter.highlight(line.text);
    line.root.classList.remove("active");
  }

  private scrollToCurrentLine(): void {
    const target = this.currentLine.root.offsetTop - this.container.clientHeight * 0.55;
    this.container.scrollTop = Math.max(0, target);
  }

  private clear(): void {
    this.lines.length = 0;
    this.renderedCursor = 0;
    this.container.replaceChildren(...this.kept());
  }

  /** Nodes such as the guestbook printout stay in the console across restarts. */
  private kept(): HTMLElement[] {
    return [...this.container.querySelectorAll<HTMLElement>("[data-keep]")];
  }
}

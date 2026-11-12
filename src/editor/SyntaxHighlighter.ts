export interface Highlighter {
  /** Returns escaped HTML for a single line of source. */
  highlight(line: string): string;
}

const TOKEN_PATTERN = new RegExp(
  [
    String.raw`(\/\/.*$)`,
    String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`,
    String.raw`\b(\d[\d_]*(?:\.\d+)?)\b`,
    String.raw`\b(const|let|for|of|if|else|return|function|class|new|import|from|export|continue|break|this|readonly|constructor|number|string|boolean|void)\b`,
    String.raw`\b([A-Z][A-Za-z0-9_]*)\b`,
    String.raw`\b([a-zA-Z_$][\w$]*)(?=\s*\()`,
  ].join("|"),
  "g",
);

const TOKEN_CLASSES = ["tok-comment", "tok-string", "tok-number", "tok-keyword", "tok-type", "tok-fn"];

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export class TsHighlighter implements Highlighter {
  highlight(line: string): string {
    let html = "";
    let last = 0;
    for (const match of line.matchAll(TOKEN_PATTERN)) {
      const start = match.index ?? 0;
      const group = match.findIndex((value, index) => index > 0 && value !== undefined);
      html += escapeHtml(line.slice(last, start));
      html += `<span class="${TOKEN_CLASSES[group - 1]}">${escapeHtml(match[0])}</span>`;
      last = start + match[0].length;
    }
    return html + escapeHtml(line.slice(last));
  }
}

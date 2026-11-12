import type { StageId } from "../core/types";

export interface CodeSegment {
  /** Stage emitted once the last character of this segment is typed. */
  readonly stage?: StageId;
  readonly code: string;
}

export interface StageMarker {
  readonly offset: number;
  readonly stage: StageId;
}

export class CodeScript {
  readonly text: string;
  readonly markers: readonly StageMarker[];

  constructor(segments: readonly CodeSegment[], separator = "\n\n") {
    let text = "";
    const markers: StageMarker[] = [];
    segments.forEach((segment, index) => {
      if (index > 0) text += separator;
      text += segment.code.replace(/^\n+|\s+$/g, "");
      if (segment.stage) markers.push({ offset: text.length, stage: segment.stage });
    });
    this.text = text;
    this.markers = markers;
  }
}

"use client";

import { useEffect } from "react";
import { startTreeApp } from "@/startTreeApp";

const GIFT_API_URL = process.env.NEXT_PUBLIC_GIFT_API_URL ?? "/api";

/**
 * Static markup for the scene, editor and gift dialogs. Everything inside is driven imperatively by
 * `startTreeApp`, so this component must never re-render after mount.
 */
export function TreeApp() {
  useEffect(() => startTreeApp({ giftApiUrl: GIFT_API_URL }), []);

  return (
    <>
      <main className="app">
        <section className="viewport">
          <canvas id="scene" />
          <div className="hud-time" id="hud-time">
            t 0.00s
          </div>          <div className="hud-info">
            <div>@daisy · 2026</div>
            <div>
              rotation <span id="hud-rotation">0.00°</span>
              <span className="hud-gap">
                lights <span id="hud-lights">0/0</span>
              </span>
            </div>
            <div>
              letters <span id="hud-letters">0</span>
              <span className="hud-gap">
                gifts <span id="hud-gifts">0</span>
              </span>
            </div>
          </div>
          <button type="button" className="gift-button" id="gift-button" hidden>
            선물 남기기
          </button>
        </section>
        <section className="editor">
          <header className="editor-bar">
            <span className="editor-file">tree.ts</span>
            <span className="editor-hint">space pause · → skip · r restart · drag rotate · click gift</span>
            <span className="editor-status" id="hud-status">
              running · 0 fps
            </span>
          </header>
          <div className="editor-body" id="editor" />
        </section>
      </main>

      <div className="modal" id="gift-compose" hidden>
        <form className="card" id="gift-form" noValidate>
          <h2 className="card-title">선물 남기기</h2>
          <label className="field">
            <span>닉네임</span>
            <input id="gift-author" name="author" autoComplete="nickname" required />
          </label>
          <label className="field">
            <span>메시지</span>
            <textarea id="gift-message" name="message" rows={4} required />
          </label>
          <fieldset className="field choice">
            <legend>모양</legend>
            <div className="segmented" id="gift-shapes">
              <label>
                <input type="radio" name="gift-shape" value="box" defaultChecked />
                <span>선물상자</span>
              </label>
              <label>
                <input type="radio" name="gift-shape" value="ornament" />
                <span>오너먼트</span>
              </label>
            </div>
          </fieldset>
          <fieldset className="field choice">
            <legend>색상</legend>
            <div className="palette-row">
              <div className="palette" id="gift-palette" />
              <button type="button" className="btn ghost small" id="gift-random-color">
                랜덤
              </button>
            </div>
          </fieldset>
          <div className="field-row">
            <span className="gift-preview">
              <span className="swatch" id="gift-swatch" />
              <span id="gift-size" />
            </span>
            <span id="gift-counter">0/200</span>
          </div>
          <p className="error" id="gift-error" role="alert" />
          <div className="actions">
            <button type="button" className="btn ghost" data-close>
              취소
            </button>
            <button type="submit" className="btn primary" id="gift-submit">
              선물하기
            </button>
          </div>
        </form>
      </div>

      <div className="modal" id="gift-popup" hidden>
        <article className="card popup">
          <header className="popup-header">
            <span className="swatch" id="popup-swatch" />
            <span>
              From. <strong id="popup-author" />
            </span>
          </header>
          <p className="popup-message" id="popup-message" />
          <time className="popup-date" id="popup-date" />
          <div className="actions">
            <button type="button" className="btn primary" data-close>
              닫기
            </button>
          </div>
        </article>
      </div>
    </>
  );
}

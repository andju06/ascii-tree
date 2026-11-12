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
          <button type="button" className="hud-icon wand" id="gift-rewind" aria-label="연 기록 지우기" title="연 기록 지우기">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 19 L14.5 9.5" />
              <path d="M16.2 3.2 L17.3 6.4 L20.6 7.2 L17.3 8.1 L16.2 11.3 L15.1 8.1 L11.8 7.2 L15.1 6.4 Z" />
            </svg>
          </button>
          <div className="hud-corner">
            <div className="hud-time" id="hud-time">
              t 0.00s
            </div>
            <button type="button" className="hud-icon" id="gift-refresh" aria-label="새로고침" title="새로고침">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5" />
                <path d="M19.5 12a7.5 7.5 0 0 1-12.6 5.5" />
                <path d="M16 3.2 V7.4 H20.2" />
                <path d="M8 20.8 V16.6 H3.8" />
              </svg>
            </button>
            <button type="button" className="gift-refresh" id="gift-list">
              방명록 한눈에 보기
            </button>
          </div>
          <div className="hud-info">
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
            방명록 남기기
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
          <h2 className="card-title">방명록 남기기</h2>
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
              남기기
            </button>
          </div>
        </form>
      </div>

      <div className="modal" id="guestbook" hidden>
        <section className="card guestbook">
          <header className="guestbook-header">
            <h2 className="card-title">방명록</h2>
            <button type="button" className="btn ghost small" data-close>
              닫기
            </button>
          </header>
          <p className="guestbook-empty" id="guestbook-empty" hidden>
            아직 남긴 글이 없습니다.
          </p>
          <ul className="guestbook-list" id="guestbook-list" />
        </section>
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

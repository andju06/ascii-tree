"use client";

import { useEffect } from "react";
import Link from "next/link";
import { startTreeApp } from "@/startTreeApp";
import { NoticeLine } from "@/ui/NoticeLine";
import { PASSCODE_LIMITS } from "@/spaces/passcode";
import { ALL_TREE_FEATURES, type TreeFeatures } from "@/spaces/features";

const DEFAULT_GIFT_API_URL = process.env.NEXT_PUBLIC_GIFT_API_URL ?? "/api";

export interface TreeAppProps {
  readonly giftApiUrl?: string;
  /** Personal tree: guestbook entries carry a password. */
  readonly entryPasscode?: boolean;
  /** Shows a button that copies this page URL. */
  readonly share?: boolean;
  readonly notice?: boolean;
  readonly features?: TreeFeatures;
  /** Logged-in visitor who already has a personal tree. */
  readonly hasTree?: boolean;
  /** Logged-in visitor can open account settings. */
  readonly signedIn?: boolean;
  /** Signed-in admin desk session opens the desk instead of account settings. */
  readonly admin?: boolean;
  /** Shown on the tree so the main tree and a personal tree stay distinct. */
  readonly treeLabel?: string;
}

/**
 * Static markup for the scene, editor and gift dialogs. Everything inside is driven imperatively by
 * `startTreeApp`, so this component must never re-render after mount.
 */
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.5c1.4-3 3.6-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
    </svg>
  );
}

function CloseButton() {
  return (
    <button type="button" className="hud-icon" data-close aria-label="닫기" title="닫기">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    </button>
  );
}

export function TreeApp({
  giftApiUrl = DEFAULT_GIFT_API_URL,
  entryPasscode = false,
  share = false,
  notice = false,
  features = ALL_TREE_FEATURES,
  hasTree = false,
  signedIn = false,
  admin = false,
  treeLabel = "메인 트리",
}: TreeAppProps) {
  useEffect(
    () => startTreeApp({ giftApiUrl, entryPasscode, features }),
    [giftApiUrl, entryPasscode, features],
  );

  return (
    <>
      <main className="app">
        <section className="viewport">
          <canvas id="scene" />
          {notice ? <NoticeLine /> : null}
          <button type="button" className="hud-icon wand" id="gift-rewind" aria-label="연 기록 지우기" title="연 기록 지우기">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.2 20.2 L12.2 11.1" />
              <path d="M15.8 0.8 L17.4 5.4 L22 7 L17.4 8.6 L15.8 13.2 L14.2 8.6 L9.6 7 L14.2 5.4 Z" />
            </svg>
          </button>
          <button type="button" className="hud-icon skip-draw" id="skip-draw" aria-label="건너뛰기" title="건너뛰기">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6v12l8-6z" />
              <path d="M13 6v12l8-6z" />
            </svg>
          </button>
          <p className="tree-kind">{treeLabel}</p>
          {share ? (
            <Link className="make-tree" href="/">
              홈으로 가기
            </Link>
          ) : (
            <a className="make-tree" href="/me">
              {hasTree ? "내 트리 가기" : "내 트리 만들기"}
            </a>
          )}
          <div className="hud-corner">
            <div className="hud-time" id="hud-time">
              t 0.00s
            </div>
            <div className="hud-actions">
              <button type="button" className="hud-label" id="gift-list">
                방명록
              </button>
              <button type="button" className="hud-label" id="gift-button" hidden>
                방명록 남기기
              </button>
              {share ? (
                <button type="button" className="hud-icon" id="share-tree" aria-label="공유하기" title="공유하기">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="6" cy="12" r="2.2" />
                    <circle cx="17" cy="6.5" r="2.2" />
                    <circle cx="17" cy="17.5" r="2.2" />
                    <path d="M8 11.2 L15 7.6" />
                    <path d="M8 12.8 L15 16.4" />
                  </svg>
                </button>
              ) : null}
              {signedIn && admin ? (
                <a className="hud-icon" href="/admin" aria-label="관리" title="관리">
                  <PersonIcon />
                </a>
              ) : signedIn ? (
                <button
                  type="button"
                  className="hud-icon"
                  aria-label="내정보"
                  title="내정보"
                  onClick={() => window.dispatchEvent(new Event("account-open"))}
                >
                  <PersonIcon />
                </button>
              ) : share ? null : (
                <button
                  type="button"
                  className="hud-icon"
                  aria-label="로그인"
                  title="로그인"
                  onClick={() => window.dispatchEvent(new Event("auth-open"))}
                >
                  <PersonIcon />
                </button>
              )}
            </div>
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
          <header className="console-bar">
            <h2 className="card-title">방명록 남기기</h2>
            <CloseButton />
          </header>
          <div className="console-body">
          <label className="field">
            <span>닉네임</span>
            <input id="gift-author" name="author" autoComplete="nickname" required />
          </label>
          <label className="field">
            <span>메시지</span>
            <textarea id="gift-message" name="message" rows={4} required />
          </label>
          {entryPasscode ? (
            <label className="field">
              <span>비밀번호</span>
              <input
                id="gift-passcode"
                name="passcode"
                type="password"
                autoComplete="new-password"
                minLength={PASSCODE_LIMITS.min}
                maxLength={PASSCODE_LIMITS.max}
                required
              />
            </label>
          ) : null}
          <fieldset className="field choice">
            <legend>모양</legend>
            <div className="segmented" id="gift-shapes">
              <label>
                <input type="radio" name="gift-shape" value="box" defaultChecked />
                <span><i className="present" aria-hidden="true" />선물상자</span>
              </label>
              <label>
                <input type="radio" name="gift-shape" value="ornament" />
                <span><i className="bauble" aria-hidden="true" />오너먼트</span>
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
            <button type="submit" className="btn primary" id="gift-submit">
              남기기
            </button>
          </div>
          </div>
        </form>
      </div>

      <div className="modal" id="guestbook" hidden>
        <section className="card guestbook">
          <header className="console-bar guestbook-header">
            <h2 className="card-title">방명록</h2>
            <div className="guestbook-actions">
              <button type="button" className="hud-icon" id="guestbook-compose" hidden aria-label="남기기" title="남기기">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
                </svg>
              </button>
              <button type="button" className="hud-icon" id="guestbook-refresh" aria-label="새로고침" title="새로고침">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.2-5.5" />
                  <path d="M20 4v5h-5" />
                </svg>
              </button>
              <CloseButton />
            </div>
          </header>
          <div className="console-body">
            <p className="guestbook-empty" id="guestbook-empty" hidden>
              아직 남긴 글이 없습니다.
            </p>
            <ul className="guestbook-list" id="guestbook-list" />
          </div>
        </section>
      </div>

      <div className="modal" id="gift-popup" hidden>
        <article className="card popup">
          <header className="console-bar popup-header">
            <span className="swatch" id="popup-swatch" />
            <span>
              From. <strong id="popup-author" />
            </span>
            <CloseButton />
          </header>
          <div className="console-body">
            <p className="popup-message" id="popup-message" />
            <time className="popup-date" id="popup-date" />
            <div className="popup-tools entry-tools" id="popup-tools" hidden />
            <div id="popup-panel" />
          </div>
        </article>
      </div>
    </>
  );
}

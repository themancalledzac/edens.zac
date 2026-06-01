'use client';

// TEMPORARY on-screen diagnostic for the mobile full-screen white-strip bug.
// Rendered only when the URL has ?fsdebug=1. Prints real viewport + element geometry from the
// device, outlines each modal layer in a distinct color, and draws a magenta line at the
// overlay's fixed bottom edge.
//   cyan outline   = .overlayContainer (the flex centering box)
//   red outline    = .imageWrapper / .imageWrapperLoaded (the WHITE 8px frame)
//   yellow outline = .fullScreenImage (the image/video itself)
// DELETE this file (and its use in FullScreenModal) once the bug is resolved.

import { useEffect, useState } from 'react';

type Snapshot = Record<string, string | number>;

function probeUnit(value: string): number {
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;left:-9999px;top:0;width:1px;height:${value};box-sizing:border-box;`;
  document.body.appendChild(d);
  const h = d.getBoundingClientRect().height;
  d.remove();
  return Math.round(h);
}

function probeSafeBottom(): number {
  const d = document.createElement('div');
  d.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1px;height:0;box-sizing:content-box;padding-bottom:env(safe-area-inset-bottom);';
  document.body.appendChild(d);
  const h = d.getBoundingClientRect().height;
  d.remove();
  return Math.round(h);
}

function rectBottom(sel: string): number {
  const el = document.querySelector(sel);
  return el ? Math.round(el.getBoundingClientRect().bottom) : -1;
}
function rectTop(sel: string): number {
  const el = document.querySelector(sel);
  return el ? Math.round(el.getBoundingClientRect().top) : -1;
}

// Identify the element painting a given point + its computed background color.
// pointer-events:none elements (the debug overlay/line) are skipped by elementFromPoint,
// so this reports the real visual stack. A white bg here = the surface bleeding through.
function elAt(x: number, y: number): string {
  const el = document.elementFromPoint(x, y);
  if (!el) return 'null(off-viewport)';
  return `${el.tagName.toLowerCase()} ${getComputedStyle(el).backgroundColor}`;
}

export function FsDebug() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  // Outline each modal layer + tint the page canvas lime, so the screenshot shows whether the
  // bottom white is an uncovered page area (shows lime) or an actual white element (stays white).
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      [class*="overlayContainer"] { outline: 2px solid cyan !important; outline-offset: -2px; }
      [class*="imageWrapper"] { outline: 2px solid red !important; outline-offset: -2px; }
      [class*="fullScreenImage"] { outline: 2px solid yellow !important; outline-offset: -2px; }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const wrapBottom = rectBottom('[class*="imageFullScreenWrapper"]');
      const frameSel = document.querySelector('[class*="imageWrapperLoaded"]')
        ? '[class*="imageWrapperLoaded"]'
        : '[class*="imageWrapper"]';
      const frameTop = rectTop(frameSel);
      const frameBottom = rectBottom(frameSel);
      const imgBottom = rectBottom('[class*="fullScreenImage"]');
      const vv = window.visualViewport;
      const innerH = window.innerHeight;
      // Vertical scan UP from the bottom at center-x: maps the "black bar" — what element paints
      // each height and how tall the bar is (wrapper backdrop? body? matte cut off?).
      const cx = Math.round(window.innerWidth / 2);
      setSnap({
        inner: `${window.innerWidth}x${innerH}`,
        visualVP: vv
          ? `${Math.round(vv.width)}x${Math.round(vv.height)} top${Math.round(vv.offsetTop)}`
          : 'n/a',
        'vh/dvh': `${probeUnit('100vh')}/${probeUnit('100dvh')}`,
        'svh/lvh': `${probeUnit('100svh')}/${probeUnit('100lvh')}`,
        safeBottom: probeSafeBottom(),
        wrapBottom,
        'gapBelowWrap(innerH-wrap)': innerH - wrapBottom,
        'FRAME top/bot(red)': `${frameTop}/${frameBottom}`,
        'gapBelowFrame(innerH-frame)': innerH - frameBottom,
        'IMG bottom(yellow)': imgBottom,
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        'fsH(var)':
          getComputedStyle(document.documentElement).getPropertyValue('--fs-height').trim() ||
          'unset',
        [`y${innerH - 2}`]: elAt(cx, innerH - 2),
        [`y${innerH - 24}`]: elAt(cx, innerH - 24),
        [`y${innerH - 48}`]: elAt(cx, innerH - 48),
        [`y${innerH - 72}`]: elAt(cx, innerH - 72),
      });
    };
    update();
    const id = window.setInterval(update, 400);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  if (!snap) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 8,
          background: 'magenta',
          zIndex: 100000,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 8,
          top: 8,
          zIndex: 100001,
          background: 'rgba(0,0,0,0.88)',
          color: '#0f0',
          font: '12px/1.4 monospace',
          padding: '8px 10px',
          borderRadius: 6,
          pointerEvents: 'none',
          maxWidth: '72vw',
          whiteSpace: 'pre',
        }}
      >
        {Object.entries(snap)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')}
      </div>
    </>
  );
}

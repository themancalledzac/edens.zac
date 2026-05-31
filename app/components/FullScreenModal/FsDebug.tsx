'use client';

// TEMPORARY on-screen diagnostic for the mobile full-screen white-strip bug.
// Rendered only when the URL has ?fsdebug=1. Prints real viewport numbers from the
// device and draws a magenta line at the overlay's fixed bottom edge so a screenshot
// shows exactly where the overlay ends vs. where any white strip starts.
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

export function FsDebug() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const update = () => {
      const wrapper = document.querySelector('[class*="imageFullScreenWrapper"]');
      const wr = wrapper?.getBoundingClientRect();
      const vv = window.visualViewport;
      const innerH = window.innerHeight;
      const wrapBottom = wr ? Math.round(wr.bottom) : -1;
      const vvBottom = vv ? Math.round(vv.offsetTop + vv.height) : -1;
      setSnap({
        inner: `${window.innerWidth}x${innerH}`,
        visualVP: vv
          ? `${Math.round(vv.width)}x${Math.round(vv.height)} top${Math.round(vv.offsetTop)} sc${vv.scale.toFixed(2)}`
          : 'n/a',
        clientH: document.documentElement.clientHeight,
        screen: `${screen.width}x${screen.height}`,
        dpr: window.devicePixelRatio,
        vh: probeUnit('100vh'),
        dvh: probeUnit('100dvh'),
        svh: probeUnit('100svh'),
        lvh: probeUnit('100lvh'),
        safeBottom: probeSafeBottom(),
        wrapTop: wr ? Math.round(wr.top) : -1,
        wrapBottom,
        'innerH-wrapBottom': innerH - wrapBottom,
        'vvBottom-wrapBottom': vv ? vvBottom - wrapBottom : 'n/a',
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
          maxWidth: '70vw',
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

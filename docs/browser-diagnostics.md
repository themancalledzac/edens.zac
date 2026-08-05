# Browser Diagnostics

Copy-paste snippets for the DevTools console. Each one returns a **single object** so the whole
result can be copied out of the console in one go and pasted back into a chat or issue — no
screenshots of console output, no "what does it say now?" round-trips.

The snippets below are deliberately kept on one line (guarded with `<!-- prettier-ignore -->`);
Prettier would otherwise reflow them, and multi-line pastes get mangled by the console's
auto-indent.

## The pattern

Write diagnostics as an IIFE that returns one flat object:

```js
(() => {
  /* measure */
  return { thing, controlValue, worstOffenders: [] };
})();
```

Rules that make these worth reusing:

- **Return, never `console.log`.** A returned object is expandable and copyable; logs are not.
- **Include the control value, not just the suspect.** `innerWidth` next to `clientWidth` is what
  turns "it looks wrong" into a diagnosis — a snippet reporting only the symptom can't distinguish
  causes.
- **Sort and cap lists** (`.sort(...).slice(0, 8)`), so a page with 400 offenders still produces a
  pasteable result.
- **Truncate class names** (`.slice(0, 60)`) — CSS-module hashes are long and add nothing.

## Horizontal overflow: what is wider than the viewport?

Returns the page-level numbers plus the widest elements crossing either edge.

<!-- prettier-ignore -->
```js
(()=>{const d=document.documentElement,vw=d.clientWidth,o=[];document.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect();if(r.width||r.height){if(r.right>vw+1||r.left<-1)o.push({cls:String(e.className||'').slice(0,60),l:Math.round(r.left),right:Math.round(r.right),w:Math.round(r.width)})}});return{innerWidth,clientWidth:vw,scrollWidth:d.scrollWidth,overflow:d.scrollWidth-vw,devicePixelRatio,count:o.length,worst:o.sort((a,b)=>b.w-a.w).slice(0,8)}})()
```

Reading it:

- `innerWidth !== clientWidth` — the window and the layout viewport disagree. `useViewport` measures
  `window.innerWidth`, so the layout is being sized off the wrong number.
- `overflow > 0` with entries in `worst` — real overflow; `worst[0]` is the element to fix.
- `overflow: 0` and `count: 0` — the document does **not** overflow. If something still visibly pans,
  it is not the page (see the next snippet).

> `body` sets `overflow-x: clip` (`app/styles/globals.css`) and `html` is `visible`, so the clip
> propagates to the viewport. That **clamps `scrollWidth`**, so `scrollWidth` alone is not a
> trustworthy overflow oracle here — the per-element `getBoundingClientRect()` scan is, because rects
> are unaffected by clipping. Always read `count`/`worst`, not just `overflow`.

## Is it the page scrolling, or the DevTools device frame?

In device mode, when the emulated device is wider than the DevTools viewport area, Chrome pans the
**device frame** — which looks exactly like page overflow and crops screenshots on the right.

<!-- prettier-ignore -->
```js
(()=>{const d=document.documentElement;const before=scrollX;scrollTo(9999,0);const forced=scrollX;scrollTo(before,0);return{scrollX_asYouLeftIt:before,scrollX_afterForcingRight:forced,clientWidth:d.clientWidth,scrollWidth:d.scrollWidth,pageCanScrollX:forced>0}})()
```

`pageCanScrollX: false` while the view visibly pans ⇒ it is the DevTools frame, not the site.

Do not reason from the CSS spec about whether a page _can_ scroll — measure it. The clip-propagation
rule above makes a confident wrong answer very easy to reach.

## Layout viewport vs. what the app thinks it is

Catches stale layout after a viewport change (rotate, device-mode toggle, dock resize).

<!-- prettier-ignore -->
```js
(()=>{const d=document.documentElement;const rows=[...document.querySelectorAll('[class*=hbox],[class*=vbox]')].map(e=>Math.round(e.getBoundingClientRect().width));return{innerWidth,clientWidth:d.clientWidth,widestRow:Math.max(0,...rows),rowCount:rows.length,rows:rows.slice(0,8)}})()
```

A `widestRow` far above `clientWidth` means the BoxTree was composed for a different width than the
one currently on screen — row widths are pixel values baked at layout time.

## Headless alternative

For anything that is a pure function of the layout inputs, prefer a throwaway Jest probe over the
browser — it is deterministic and needs no auth, no server, and no viewport emulation:

```ts
const { rows } = buildContentRows(
  content,
  undefined,
  { contentWidth: 430, viewportHeight: 932, isMobile: true },
  LAYOUT.defaultChunkSize
);
rows.forEach(r => console.log(r.items.map(i => Math.round(i.width))));
```

This is how the admin-hub mobile packing bug was pinned down: the browser could not render `/admin`
without an admin session, but `buildContentRows` reproduced the exact row widths in milliseconds.

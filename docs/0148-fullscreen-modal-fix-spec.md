# FullScreen Viewer / Modal-migration — Audit & Fix Spec

> **For the follow-up (fixing) agent.** Branch `0148-design-modal-migration`. Goal: KEEP the new
> `<Modal>` paradigm, but port the behaviors that worked in the old route and correct the
> Modal-side inaccuracies. **Do NOT fully revert.** Verify in-browser on `:3001` (backend up).

## Reported symptoms (FullScreenModal / image viewer)

1. **No translucent background** behind the fullscreen image (the page used to be _slightly_ visible).
2. **On exit, the page jumps to the top** (it used to return to the exact scroll position you clicked from).

## ⚠️ Red herring to clear first

The `scrollPosition` prop removal is **NOT** the cause of the viewer regression. In the pre-migration code
(`42cfcdd`), `FullScreenModal` declared `scrollPosition` in its props _type_ (line 24) but **never referenced
it in the render** — no `top: scrollPosition`. The viewer's scroll restore was always `useBodyScrollLock`.
(`scrollPosition` WAS genuinely used by **ImageMetadataModal** — `style={{ top: scrollPosition }}` at line 490,
the `position:absolute` footgun — a _different_ shell, correctly removed.) **Re-adding `scrollPosition` to the
viewer will fix nothing.** The real causes are below.

---

## Part 1 — Audit of the OLD logic (what worked, and the mechanism)

### A. Backdrop = single 90% scrim (`fullscreen-image.module.scss` `.imageFullScreenWrapper`)

```
position: fixed; inset: 0;
min-height: var(--fs-height, 100lvh);
background-color: rgb(0, 0, 0, 0.9);     /* ← single backdrop; 10% alpha gap = "slightly visible" page */
z-index: var(--z-fullscreen);            /* 9999 */
transform: none !important; perspective: none !important;   /* parallax/3D reset */
overscroll-behavior: none; touch-action: pan-x;
```

- `--fs-height` is set from `window.visualViewport.height` (JS, in `FullScreenModal.tsx` effect) — iOS dvh/lvh fix.
- `body.fullscreen-open { background:#000 }` + `html:has(body.fullscreen-open){ background:#000 }` (globals.css ~193) darken the canvas behind the 90% overlay so iOS viewport gaps read black, not white.

### B. Scroll lock + exact-location restore (`useFullScreenImage` → `useBodyScrollLock`)

- `useFullScreenImage` calls `useBodyScrollLock(isOpen)` — **the SOLE locker**.
- `useBodyScrollLock.ts`: lock (lockCount 0→1) → `scrollYRef.current = window.scrollY`; `body{position:fixed; top:-scrollY}` via `.scroll-locked`. Unlock (lockCount→0) → clear; `window.scrollTo(0, scrollYRef.current)`.
- One locker ⇒ capture and restore happen on the **same hook instance** ⇒ exact-location restore. ✅

### C. Portal + interactions

- `createPortal(document.body)`.
- `useFullScreenImage` document `keydown`: Esc=close, ArrowLeft/Right=nav, scroll-blocking keys prevented; `wheel` prevented; touch swipe = prev/next.

---

## Part 2 — Audit of the NEW changes (commit `d988b00`) + the inaccuracies

`FullScreenModal.tsx` now ends with `return <Modal open onClose={hideImage} variant="fullscreen" labelledBy=...>{modalContent}</Modal>`, where `modalContent` is the old `.imageFullScreenWrapper`.

### Inaccuracy 1 — DOUBLE BACKDROP ⇒ page invisible (symptom 1)

- `<Modal>` `.backdrop`: `position:fixed; inset:0; background: var(--color-overlay-strong)=rgb(0,0,0,0.7); z-index: var(--z-modal)=1000`.
- INSIDE it, `.imageFullScreenWrapper` still paints `rgb(0,0,0,0.9)` (z 9999).
- Stacked alpha ≈ `1 − (0.3 × 0.1) = 0.97` ⇒ effectively opaque, no page visible.

### Inaccuracy 2 — DOUBLE SCROLL-LOCK + per-instance hook bug ⇒ jump to top (symptom 2)

- Two `useBodyScrollLock` callers now: `useFullScreenImage(isOpen)` AND `Modal(open)`.
- `useBodyScrollLock` counts at **module level** (`lockCount`) but stores `scrollY` **per-instance** (`scrollYRef`).
  Only the first locker captures `scrollY`; the second instance's ref stays `0`. Whichever cleanup drives
  `lockCount → 0` runs `scrollTo(0, thatInstance.scrollYRef)`. When that's the Modal instance → `scrollTo(0,0)` → **top**.
- Root fragility is in `useBodyScrollLock` itself (per-instance state for a module-level counter), exposed by the 2nd locker.

### Inaccuracy 3 — redundant behavior (lower priority, cleanup)

- Double Esc handling: `useFullScreenImage` document-keydown Esc + Modal dialog `onKeyDown` Esc (both call close; idempotent).
- Modal focus-trap (Tab) overlaps the viewer's own keyboard handling — verify it doesn't swallow Arrow nav / nav-button focus.
- Modal's portal + `role=dialog` ARIA are redundant with the wrapper (which already portals and is the dialog surface).

---

## Part 3 — Per-shell audit summary (all 5 migrated shells)

| Shell                    | On `<Modal>`?            | Own `useBodyScrollLock`?       | Status                                                        |
| ------------------------ | ------------------------ | ------------------------------ | ------------------------------------------------------------- |
| **FullScreenModal**      | yes (fullscreen)         | yes (`useFullScreenImage`)     | ❌ double backdrop + double scroll-lock (REPORTED)            |
| **ImageMetadataModal**   | yes (sheet)              | yes (`useImageMetadataEditor`) | ⚠️ LATENT same double scroll-lock → will jump to top on close |
| **TextBlockCreateModal** | yes (overlay)            | no                             | likely OK — verify open/close/scroll restore                  |
| **ClientGalleryGate**    | yes (overlay)            | no                             | likely OK — verify (no-op onClose; only exits on unlock)      |
| **MenuDropdown**         | **reverted** (`174f5fb`) | yes                            | OK (single locker, popover restored)                          |

---

## Part 4 — FIX SPEC (keep Modal; port what worked)

### Fix 1 — Single backdrop (restore the faint page-visibility)

Pick ONE backdrop owner. **Recommended:** Modal owns the scrim; the inner wrapper goes transparent.

- `fullscreen-image.module.scss .imageFullScreenWrapper`: **remove** `background-color: rgb(0,0,0,0.9)` (keep all layout: fixed/inset/`--fs-height`/transform-none/overscroll).
- `Modal.module.scss`: the fullscreen scrim is currently the global `.backdrop` `--color-overlay-strong` (0.7). To match the old look exactly, give the **fullscreen variant** a `0.9` backdrop (e.g. `.fullscreen { background-color: rgb(0,0,0,0.9); }` overriding `.backdrop`, or a dedicated token). Leave `overlay`/`sheet` backdrops as-is.
- Keep `body.fullscreen-open` canvas darkening — verify the iOS strip stays black.
- **Result:** a single ~0.9 scrim, page faintly visible. (Do NOT keep both backdrops.)

### Fix 2 — Correct scroll restore (THE jump-to-top fix; also fixes ImageMetadataModal)

Do **both**:

- **(a) Harden `useBodyScrollLock.ts`:** move the captured scroll offset to a **module-level variable** (captured when `lockCount` goes 0→1, restored when it returns to 0), instead of a per-instance `useRef`. Then concurrent lockers can never restore the wrong value. (Keep the iOS `position:fixed; top:-scrollY` technique.)
- **(b) Remove the now-redundant lockers** so `<Modal>` is the sole locker per shell: delete `useBodyScrollLock(isOpen)` from `useFullScreenImage.tsx` and `useBodyScrollLock(!!editingContent)` from `useImageMetadataEditor.tsx`. (With (a) this is belt-and-suspenders; without (a) the single-locker path still works — do both for robustness + cleanliness.)
- **Result:** open after scrolling → close → exact scroll position restored, for BOTH the viewer and the metadata editor.

### Fix 3 — De-duplicate Esc / focus (cleanup, lower priority)

- Let `<Modal>` own Esc-to-close; drop the Esc branch in `useFullScreenImage`'s keydown handler (KEEP ArrowLeft/Right nav, scroll-blocking-key prevention, wheel-prevent, and the swipe handlers).
- Confirm Modal's focus-trap doesn't break arrow nav or the prev/next/close buttons; if it does, scope/relax the trap for the fullscreen variant.

### Files to touch

- `app/hooks/useBodyScrollLock.ts` — module-level scroll offset (Fix 2a)
- `app/hooks/useFullScreenImage.tsx` — remove redundant lock; keep keyboard/swipe (Fix 2b, Fix 3)
- `app/hooks/useImageMetadataEditor.tsx` — remove redundant lock (Fix 2b — fixes its latent jump-to-top)
- `app/styles/fullscreen-image.module.scss` — drop the wrapper's `0.9` background (Fix 1)
- `app/components/ui/Modal/Modal.module.scss` — fullscreen-variant backdrop opacity (Fix 1)
- `app/components/FullScreenModal/FullScreenModal.tsx` — Esc dedup (Fix 3, optional)

### Verification checklist (browser, backend up, `:3001`, desktop AND ~390px mobile)

- **Viewer:** scroll down a collection → open an image → faint page visible behind the scrim (not pure black); close via X / Esc / backdrop → **exact scroll position restored**; ArrowLeft/Right + swipe navigate; EXIF panel toggles; no iOS white strip (`fullscreen-open` canvas black).
- **ImageMetadata editor:** on a manage page, scroll down → open an image's editor → no top-offset gap; close → **exact scroll restored**.
- **TextBlockCreateModal / ClientGalleryGate:** open/close, scroll restore, focus trap intact.
- `tsc --noEmit` clean; full `jest` green.

### Commit guidance

Small, separable commits: (1) `fix(scroll-lock): module-level offset` ; (2) `fix(modals): drop redundant useBodyScrollLock callers` ; (3) `fix(fullscreen): single backdrop on the fullscreen variant` ; (4) optional `refactor(fullscreen): let Modal own Esc`.

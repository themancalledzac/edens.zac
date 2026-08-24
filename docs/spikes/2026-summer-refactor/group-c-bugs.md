# Group C — Bug fixes (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

C1–C5 merged: PR #264, #281, #282, #279, #283. C6 is backend-blocked and stayed on the live board.

---

### ✅ C1 · HIGH — Unsaved people/gallery-access edits are wiped by any unrelated save — PR #264

[useCollectionEdit.tsx:478](app/components/ContentCollection/edit/useCollectionEdit.tsx:478) and [:531](app/components/ContentCollection/edit/useCollectionEdit.tsx:531). Both re-seed effects depend on array identities (`collection.people`, `collection.galleryPassword`, `collection.recipientEmails`) that change on every DTO refresh. Every save path — inline title commit, cover pick, reorder save, upload, metadata save — calls `setCurrentState(fresh DTO)`, which delivers new array identities, fires the effects, and discards staged-but-unsaved People and gallery-access edits.

Repro: add a person without saving, then commit an inline title edit. The person selection reverts.

- [x] The two effects collapsed into one, gated by its own `seededStagedFieldsIdRef` /
      `seededStagedFieldsFromAdminRef` pair — the same discipline the update buffer uses. It needs
      its OWN refs, not the buffer's: the buffer effect mutates `seededCollectionIdRef` mid-run, so
      a shared ref would let whichever effect ran first starve the other.
- [x] The gate clears when `enabled` flips false, which preserves the old re-seed-on-entering-edit-mode
      behavior. Without that, staged people/gallery would have survived an edit-mode exit while the
      update buffer is explicitly discarded by `resetToBrowse` — an asymmetry the fix has no business
      introducing.
- [x] Three regression tests in `useCollectionEdit.buffer.test.tsx`, alongside the buffer's own
      background-refresh test.

**Test trap — a regression test here passes against the buggy code unless you avoid it.** The bare
`makeCollection()` fixture never sets `people`/`recipientEmails`, so the old deps compared
`undefined === undefined`, the effect never re-fired, and the bug did not reproduce. Each DTO must
carry its own arrays — `mockImplementation(async () => makeResponse({ people: [], recipientEmails: [] }))`,
not `mockResolvedValue`, which hands back one object with one array identity. The first draft of
these tests passed against the unfixed source; only stashing the fix and re-running caught it.

Related: `useCollectionEdit.handlers.test.tsx` carries a comment instructing authors to drive
password/email through the setters "so the seed effect can't wipe them" — the bug was being worked
around in tests rather than fixed. That comment is now stale but harmless; the workaround it
describes still passes.

### ✅ C2 · About portrait declares the wrong aspect ratio — PR #281

- [x] [About.tsx:15](app/components/About/About.tsx:15) declared `width={1000} height={500}` (2:1)
      for `public/_DSC0145.jpg`, which is 3893x2920 (4:3). Both halves re-read rather than trusted:
      the file's dimensions come from its JPEG SOF segment, and the CSS is
      `.profileImage { width: 100%; height: auto }`, which is what makes the declared pair the
      aspect-ratio box the browser reserves before the file arrives. So a 2:1 declaration reserved
      the wrong shape and reflowed to 4:3 on every open. Fixed to `height={750}`
      — 1000 x 2920/3893 = 750.06. About is live code, rendered at `MenuDropdown.tsx:334`.
- [x] **Scope note: the item said ±1 and the source change is ±1, but a test went in on top.** This
      bug is invisible in code review and in a screenshot — it exists only in the moment between
      reserving the box and loading the file, which is exactly the silent class the D3 and C4 lessons
      are about. `tests/components/About/aboutImageDimensions.test.tsx` renders About and compares
      the declared ratio against the real file, reading the dimensions out of the JPEG rather than
      hardcoding them, so re-cropping or replacing the image fails the test instead of quietly
      restoring the shift. Confirmed red against `height={500}` (delta 0.667), and confirmed red a
      second time after `eslint --fix` reordered the imports and `tsc` forced a change to the file.
- [x] Not browser-verified, and it would not have proved anything: `:3000` was not running, and the
      defect is a pre-load reflow that a static screenshot cannot show. The declared attribute is the
      whole fix, and the test asserts it against the file.

### ✅ C3 · `SelectsContext.toggle` runs side effects inside a state updater — PR #282

- [x] Confirmed: `onChange?.([...next])` sat inside both `setSelectedIds(prev => …)` updaters
      ([SelectsContext.tsx](app/components/ContentCollection/SelectsContext.tsx)). StrictMode
      double-invokes updaters in development, so every toggle notified the owner twice. Reproduced
      before fixing — the new StrictMode spec reported 2 calls for one toggle, and 4 across a
      toggle plus its rollback.
- [x] **The item's prescribed mechanism was wrong, and following it literally would have introduced
      a worse bug.** "Compute `next` outside, then call the setter and the callback sequentially"
      is right for the optimistic update but breaks the rollback. The rollback's functional updater
      is load-bearing: it inverse-applies against whatever the set is *when the persist rejects*.
      Computing `next` outside would capture the set as it was when the toggle started, so a
      rollback landing after an unrelated second toggle would discard that second toggle. Verified
      by reading the closure, not assumed — `toggle` is rebuilt per render, but the pending
      `persist.catch` still holds the older one.
- [x] Fix keeps both updaters as pure `prev => next` forms and moves the notifier to an effect keyed
      on the committed `selectedIds`. Purity and rollback correctness both hold, and the owner still
      gets exactly one call per change.
- [x] The mount guard compares the previous set by identity rather than tracking a first-run flag.
      StrictMode double-invokes effects on mount too, so a flag fires on the second run — which
      would have reintroduced the same double-notify at the one moment it is hardest to notice.
      There is a spec for this: mount must not notify at all.
- [x] Coverage gap closed on the way past. The existing suite never passed `onChange`, so the
      notifier had no test of any kind — which is why a duplicate call survived. The owner is
      `setPinnedSelectedIds` ([CollectionPageClient.tsx:560](app/components/ContentCollection/CollectionPageClient.tsx:560)),
      a plain setState, so the duplicate was idempotent and invisible. The new specs assert call
      counts rather than payloads for exactly that reason.
- [x] Dropped the two inline comments in the function body while rewriting those lines, per G2.

**Behavioral change worth knowing.** `onChange` now fires after the commit rather than during the
update phase, so the owner's state lands one render later than the Set does. It is immaterial for
the only consumer — a setState feeding a pinned prepend — but a future consumer that needs the
notification inside the same commit would have to be built differently.

### ✅ C4 · Cache tags that never connect — PR #279

**Shipped: four dead revalidate targets, not five.** The fifth, `collection-home`, was not dead —
the audit below was wrong about it, and the fix was to keep it and write down why. The
`collections-location-${slug}` half was left alone as scoped; the report on it is at the end.

- [x] FOUR dead tags removed from `revalidateMetadataCache` ([collectionEditUtils.ts:220](app/components/ContentCollection/edit/collectionEditUtils.ts:220)).
      `content-people` was never registered, and A2 (PR #256) deleted the fetches that registered
      `content-cameras`, `content-lenses`, `content-film-metadata`. Deleting them is safe, not just
      tidy: the only surviving metadata read is `getMetadata` ([collections.ts:329](app/lib/api/collections.ts:329))
      and it is `cache: 'no-store'`, so no cached data sits behind those tags waiting to go stale.
      `content-tags`, `content-locations` and `search-images` stay.
- [x] **`collection-home` is NOT a dead tag. The table below was wrong.** `HOME_SLUG = 'home'` and
      `app/page.tsx` renders `CollectionPageWrapper slug="home"`, so `getCollectionBySlug('home')`
      registers `collection-${slug}` as exactly the string `collection-home`
      ([collections.ts:108](app/lib/api/collections.ts:108)). The audit missed it because it grepped
      for literal tag strings and this registration is a template — the precise blind spot E11 was
      filed to describe. Two independent checks before keeping it, both run rather than reasoned:
      deleting the revalidate call turns two existing cases in `manageUtils.test.ts` red, and both
      `app/page.tsx` and `app/[slug]/page.tsx` carry `force-dynamic` as an explicitly TEMPORARY
      workaround with a written restore plan (`revalidate = 3600; dynamic = 'error'`), so removing
      the tag would have planted a bug that only appears when that `@todo` is cleared. A docblock on
      `revalidateCollectionCache` now says this, because the next person to grep for the literal will
      reach the same wrong conclusion.
- [x] Regression tests added for `revalidateMetadataCache`, which had none — nothing asserted its
      POST body at all. Both new cases were confirmed red against the unfixed source before the fix
      went in.
- [ ] `collections-location-${slug}` — untouched, as scoped. Report below.

**Corrected register-vs-revalidate audit.** Re-grepped 2026-08-25. The line numbers in the previous
version of this table were off by one on every `revalidateMetadataCache` row.

| Tag | Registered | Revalidated | State |
| --- | --- | --- | --- |
| `collections-index` | `collections.ts:84` | `collectionEditUtils.ts:209` | connected |
| `collection-${slug}` | `collections.ts:108` | `collectionEditUtils.ts:208` | connected |
| `collection-home` | `collections.ts:108`, as `collection-${slug}` with slug = `home` | `collectionEditUtils.ts:210` | **connected — was misfiled as dead** |
| `content-tags` | `content.ts:42` | `collectionEditUtils.ts:227` | connected |
| `content-locations` | `content.ts:58` | `collectionEditUtils.ts:230` | connected |
| `search-images` | `content.ts:104` | `collectionEditUtils.ts:233` | connected |
| `collections-location-${slug}` | `collections.ts:151` | — | **orphan registration — left alone** |
| `content-people` | — | — | **deleted by this MR** |
| `content-cameras` | — | — | **deleted by this MR** |
| `content-lenses` | — | — | **deleted by this MR** |
| `content-film-metadata` | — | — | **deleted by this MR** |


**The `collections-location-${slug}` report moved to E12** on the live board when this section was archived — it was open, sized work with no board row of its own. See [E12](../2026-summer-refactor.md#-e12--wire-up-collections-location-slug).

### ✅ C5 · Assorted LOW bugs — PR #283

**All five bullets verified true as written.** This is the first item this session whose claims
survived checking unchanged — C4's audit method and C3's prescribed mechanism both turned out wrong.
Worth recording, because the doc's verification rules only look like overhead until they are not.

- [x] `sizes` rendered the literal `"(max-width: 768px) 100vw, NaNpx"`. `imageProps` was built before
      the NaN recovery ran, so the template interpolated the raw `width`. Reproduced before fixing.
      `resolveValidDimensions` is now hoisted above `imageProps` and `sizes` uses `validWidth`; the
      hoist is safe because that function is pure with no logging of its own. The diagnostic
      `logger.error` moved with it, so validation now sits together above first use.
      Tests: `tests/components/Content/CollectionContentRenderer.nanSizes.test.tsx`.
- [x] `{...prev!}` fabricated a truncated DTO on upload and text-block success. Both sites are now
      `setCurrentState(response)`. Two things the bullet did not say and that make the fix stronger:
      these were the **only two** of eleven `setCurrentState` call sites not passing a whole DTO, and
      the spread was discarding fresh metadata lists even when `prev` was non-null — `response` comes
      back from the server with current `tags`/`people`/`cameras`/`lenses`/`filmTypes`, and the old
      code kept the stale ones and swapped only `collection`. The null-`prev` case is reachable, not
      theoretical: when the initial admin fetch resolves null the load effect does not retry — its
      deps are `[enabled, slug, currentState?.collection.slug]`, none of which change on a null
      response — so `currentState` stays null until some other operation writes it.
      Tests: `tests/components/ContentCollection/useCollectionEdit.handlers.test.tsx`. Writing them
      turned up a second gap: `handleTextBlockSubmit` had **no test anywhere in `tests/`** before
      this. The handler is `handleMediaUpload`, not the `handleImageUpload` named in stale docblocks.
- [x] Deleted the cached-image fallback in `useFullScreenImage`, kept the GIF branch as instructed.
      The bullet's reasoning was confirmed at the source rather than taken on trust: the modal renders
      `next/image` with **no `unoptimized` prop**, so the DOM `src` is always a `/_next/image?url=…`
      rewrite and `img[src="<raw CloudFront URL>"]` could never match — in production or in dev. The
      `setTimeout`/`clearTimeout` polling went with it, since it existed only to retry that lookup.
      Tests: `tests/hooks/useFullScreenImage.gifLoaded.test.tsx`.
- [x] Normalized 12 `width > 768px` blocks in `app/styles/fullscreen-image.module.scss` to `>=`,
      matching the 83 other declarations. Guarded by a repo-wide scan rather than a fixed count, so
      the next file to drift fails too: `tests/styles/breakpointConsistency.test.ts`.
- [x] Proxy 502 log hardened to `error.message` plus `error.code`. The token-leak premise stays
      disproven and this stays out of Group D. **But the raw-error log was empirically worse than the
      bullet claimed:** a test asserting the serialised log call contains no `host`/`port` goes red
      against the old code, because passing the raw error does serialise its `cause` chain including
      the upstream address. Not a token, so not a security item — but it is a real leak of internal
      topology into platform logs, which is exactly what defence in depth is for.
      Tests: `tests/api/proxy/route.logHygiene.test.ts`.

**Every one of these was proved red before the fix went in.** None of the 4,112 tests already on the
branch failed against any of the five bugs, which is the whole reason the item existed.

**Carried forward, not fixed here.** The surviving GIF effect in `useFullScreenImage` keys only on
`[fullScreenState?.currentIndex]`. Swapping the images array while holding the same index would not
mark a GIF loaded. That dependency list is unchanged from before this MR and there is no code path
that does it today, so it is noted rather than fixed — but the new test does not cover it either,
and a future sectioned-viewer change could reach it.

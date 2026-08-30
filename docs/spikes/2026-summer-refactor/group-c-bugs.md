# Group C — Bug fixes (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

C1–C8 merged: PR #264, #281, #282, #279, #283, #327, #331, #291. C9, C10 and C11 are open on the live board.

## Closed rows

| MR  | Scope                                                 | Outcome                                                                                              |
| --- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| C1  | Unsaved people/gallery-access wipe (HIGH)             | +73 −11 · #264                                                                                       |
| C2  | About portrait aspect ratio                           | +99 −5 · #281                                                                                        |
| C3  | `SelectsContext.toggle` purity                        | +121 −10 · #282                                                                                      |
| C4  | Cache tags that never connect                         | +155 −62 · #279 — the `collections-location-${slug}` report became E12                               |
| C5  | Assorted LOW bugs                                     | +497 −101 (11 files) · #283                                                                          |
| C6  | Password cover strip missing on the public card path  | +44 src / +73 test (est ±30) · #327 — premise was FALSE (backend never stripped); unification DECLINED |
| C7  | `emailShareLink` POSTs to a route that does not exist | 0 src / +34 test (#331 total +185 −101) — FE was already complete, 409 included; unification DECLINED |
| C8  | Unfollowing leaves the chip count stale               | +418 −22 (est. +40/+80) · #291                                                                       |

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
      is load-bearing: it inverse-applies against whatever the set is _when the persist rejects_.
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

| Tag                            | Registered                                                       | Revalidated                  | State                                |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------------- | ------------------------------------ |
| `collections-index`            | `collections.ts:84`                                              | `collectionEditUtils.ts:209` | connected                            |
| `collection-${slug}`           | `collections.ts:108`                                             | `collectionEditUtils.ts:208` | connected                            |
| `collection-home`              | `collections.ts:108`, as `collection-${slug}` with slug = `home` | `collectionEditUtils.ts:210` | **connected — was misfiled as dead** |
| `content-tags`                 | `content.ts:42`                                                  | `collectionEditUtils.ts:227` | connected                            |
| `content-locations`            | `content.ts:58`                                                  | `collectionEditUtils.ts:230` | connected                            |
| `search-images`                | `content.ts:104`                                                 | `collectionEditUtils.ts:233` | connected                            |
| `collections-location-${slug}` | `collections.ts:151`                                             | —                            | **orphan registration — left alone** |
| `content-people`               | —                                                                | —                            | **deleted by this MR**               |
| `content-cameras`              | —                                                                | —                            | **deleted by this MR**               |
| `content-lenses`               | —                                                                | —                            | **deleted by this MR**               |
| `content-film-metadata`        | —                                                                | —                            | **deleted by this MR**               |

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

---

### ✅ C8 · Unfollowing leaves the chip count stale

Found while researching H1, filed separately because it is a bug on `main` today, independent of
whether H1 ever ships. **Do this before H1** — see H1's second "must fix" bullet for why.

- [ ] `FollowsProvider` holds a client-only `useState<Set<number>>` at
      [FollowsContext.tsx:39](app/components/Personal/FollowsContext.tsx:39), with an optimistic
      toggle at [:59](app/components/Personal/FollowsContext.tsx:59) and rollback at
      [:73](app/components/Personal/FollowsContext.tsx:73).
- [ ] The chip count is server-rendered: `userSpaceData.ts` builds the `following` section with
      `count: followed.ok ? followedCollectionIds.length : undefined`.
- [ ] Nothing sends the toggle back to the server, so the count cannot update until the next full
      server render.

**Verified 2026-08-23 by a parallel session, three checks, all read from `origin/main`.** Recorded
here because the mechanism was originally asserted from an agent report and that is not evidence:

1. _Is the count from the id list or the rendered blocks?_ The id list — and its docblock says so
   deliberately, because a followed collection that was deleted, or that falls outside the 500-row
   catalog page, still counts without being renderable. **This constrains the fix:** keep the server
   number as the base and apply a client delta. Recomputing from rendered tiles would silently
   change what the number means.
2. _Is the mutation client-only?_ Yes. Worth noting the code is better than first described — it
   keeps a ref mirror so two rapid clicks each observe the other's result, with a docblock
   explaining why a functional updater cannot inform the persist direction. That is C3's lesson
   already applied.
3. _Does anything trigger a server re-render on toggle?_ No, and this is the decisive check.
   `addFollow` and `removeFollow` ([personal.ts:63](app/lib/api/personal.ts:63) and
   [:77](app/lib/api/personal.ts:77)) are plain `fetch` calls returning `void`. A grep for
   `router.refresh|revalidateTag|revalidatePath` across `app/components/Personal/`,
   `app/components/UserSpace/` and `personal.ts` returns nothing. `FollowButton`'s `onClick` calls
   `follows.toggle(collectionId)` and stops.

**The gate is the red test.** Mount with a non-zero followed count, unfollow, assert the chip
decrements — and confirm that fails against pre-fix `main` before the fix is written. A regression
test that has been watched to go red is repeatable, stays in the suite, and is the evidence this
item stands on.

**Gap, stated rather than papered over: nobody has watched the badge go stale in a browser.** It
needs a signed-in account with existing follows, which no agent session should be driving. The
static chain closes without it — server-rendered number, client-only mutation, no path back — and
the red test closes it further. Do not treat that as equivalent to observation, though: a test can
encode the same wrong model as the fix and pass for the wrong reason, which is exactly how C1's
first draft went green against buggy source. If anyone is in front of a signed-in session with
follows, spend the minute and confirm it live.

Fix constraint, carried from check 1 above: keep the server number as the base and apply a client
delta below `FollowsProvider`. Never recompute from rendered tiles — that silently changes what the
number means. `UserSpace.tsx` is a Server Component with no `'use client'`, so the adjustment lives
in a client component underneath it; do not convert `UserSpace.tsx`.

**SHIPPED — PR #291, merged 2026-08-24. +418 −22 across 6 files.** The fix honoured every constraint this item recorded.

- [x] New client component `UserSpaceGrid.tsx` sits directly below `FollowsProvider` and hands the sections on to `CollectionPageClient`. `UserSpace.tsx` stays a Server Component — it builds the count but cannot watch it change, and `useFollows()` is only callable below the provider.
- [x] `CollectionPageClient` and `FilterToolbar` were deliberately not taught about follows. Both are shared by every collection page, and "the Following section counts follows" is a fact about the user space, not about collection pages generally.
- [x] `reconcileFollowingCount` applies a set-difference delta against the ids the render was built from. **It never counts tiles**, so a followed collection that was deleted or falls outside the 500-row catalog page still counts — the semantics the loader docblock protects.
- [x] **A failed read stays `undefined`, guarded twice.** The function returns `sections` untouched when the client set is `undefined`, and the map only rewrites a section when `section.count !== undefined`. A delta applied to a failed read would satisfy "never counts tiles" while still destroying the semantics. Pinned by `says nothing rather than counting from a state nobody read`.
- [x] **Five of eight tests confirmed red first.** The failure DOM showed the bug exactly: the button already read `aria-pressed="false"` / "Follow" while `count-following` still read `2`.
- [x] Two of the eight cover the rollback, which is C3's lesson applied rather than re-learned — a prescribed fix can be right on the happy path and destructive on the error path. `FollowsContext` keeps a ref mirror so its rollback inverse-applies against the latest membership; the count delta had to inherit that rather than assume it.
- [x] Test churn worth knowing: `UserSpace.test.tsx` and `app/user/page.test.tsx` walk the tree without rendering, so their `findProps` targets moved from `CollectionPageClient` to `UserSpaceGrid`. `page.test.tsx` and `UserSpace.sectionSwitch.test.tsx` needed `useFollows: () => null` in their `FollowsContext` mocks.
- [x] **Not done: a browser reproduction**, as this item asked for. It needs a signed-in account with existing follows. The red regression test is the gate that replaced it, and it is stronger in one way (repeatable, and it stays in the suite) and weaker in another (a test written from the same mental model as the fix can encode the same error). If anyone is in front of a signed-in session, it is still worth the minute.

---

### ✅ C6 · Password cover strip was missing on the public collection-card path — PR #327

Split out of E1, which deliberately left it alone to stay a provable no-op. Filed as a frontend
oversight, reclassified as backend-blocked on 2026-08-23, unblocked by backend PR #209, shipped
2026-08-25.

`convertCollectionContentToParallax` ([contentLayout.ts](app/utils/contentLayout.ts)) passed
`col.coverImage` through unconditionally, so a password-protected client gallery reached a public
card with its cover intact. `collectionToContentModel`
([CollectionPage.tsx](app/components/ContentCollection/CollectionPage.tsx)) already stripped on the
`CollectionModel` path. Both feed the same parallax card.

**What shipped.** `ContentCollectionModel` gains `isPasswordProtected?: boolean` (optional — a
payload cached before backend #209 carries no such key). `convertCollectionContentToParallax`
strips on it, keyed on `=== true` alone so a payload missing the kind booleans still strips.
`processContentBlocks` takes a fifth `showProtectedCovers` parameter defaulting to `false`.

**The opt-in is threaded, not hardcoded, and that was not in the board's "two-line change".** The
three public callers of `processContentBlocks` pass `filterVisible=true`; the two admin manage
surfaces (`EditModeLayer`, `useCollectionEdit`) pass `false`. An unconditional strip would have
silently hidden protected child covers in admin edit mode, where an admin managing a parent needs
to recognise a protected child by its cover. The parameter is deliberately separate from
`filterVisible` even though the two agree at every call site today: tying a cover-visibility
decision to a hidden-block decision couples two things that can drift apart.

#### The premise was false, in the direction nobody checked

**C6's stated rationale — "defense-in-depth against a stale cache re-exposing a cover the backend
already strips" — describes behaviour that has never existed.** The backend is explicit, in three
places:

- `ContentModels.java:231-234`: `isPasswordProtected` is "a render hint, not a gate: it tells the
  frontend to draw a locked tile. `coverImage` is deliberately still populated alongside it,
  matching the detail response."
- The BE-H5 tests pin that the cover is **RETAINED** for a protected gallery — no cookie, invalid
  cookie, and valid cookie alike. Their banner reads: the old "must be stripped" text
  "contradicted all three tests below and led a frontend reviewer to build against a stripping
  behaviour that has never existed."
- Backend #209's commit message: "the cover is still returned alongside the flag... Fixes the BE-H5
  test banner that claimed the opposite and sent the frontend down a wrong branch."

So `collectionToContentModel`'s docblock claim, "Backend BE-H5 strips it at the API", was wrong, and
the strip it justified is not redundant hardening — it is the only thing keeping a locked gallery's
cover off a card. Both docblocks now say so. **The board quoted `:231`'s "render hint, not a gate"
and stopped one sentence early**; the very next clause is the one that falsifies the item.

**The decision taken.** The backend shipped the field so the frontend could draw a locked tile with
the cover visible. Stripping instead is a deliberate divergence from that intent, chosen 2026-08-25
for consistency with the path that already stripped. **A locked-tile treatment is still unbuilt** —
the backend shipped `isPasswordProtected` so one could be drawn, but its board tracks no wait on it
(corrected 2026-08-29; the earlier "the thing the backend is waiting on" overstated). See the
follow-up note at the end of this entry.

**The rule this earns, and it is not the one C6 already carried.** C6 already taught "before filing
a frontend fix for a missing field check, grep the type". That is about whether the data exists.
This one is about what the data _means_: **when an item's rationale asserts what the OTHER repo
does, quote that repo's own words in full before building on it — including the sentence after the
one that supports you.** A paraphrase of a sibling repo's behaviour is a claim like any other, and
this board's drift sweep cannot see it. The cheapest check is the tests: BE-H5's three test names
each end in `retainsCoverImage`, and reading any one of them settles the question in seconds.

#### Unification cost: do NOT merge the two functions

The C6 guardrail asked for this analysis rather than the merge. The guardrail was right, and the
reason is sharper than "they take different model types".

**8 of 17 builder options differ**, and the differences are not cosmetic:

| `buildParallaxCard` option | `collectionToContentModel`                         | `convertCollectionContentToParallax`   |
| -------------------------- | -------------------------------------------------- | -------------------------------------- |
| `id`                       | `col.id`                                           | `col.id ?? col.referencedCollectionId` |
| `collectionId`             | `col.id`                                           | `col.referencedCollectionId`           |
| `orderIndex`               | `0` (hardcoded)                                    | `col.orderIndex`                       |
| `visible`                  | `col.visibility === undefined ? true : === LISTED` | `col.visible ?? true`                  |
| `rating`                   | not passed                                         | `col.rating ?? undefined`              |
| `tags`                     | not passed, deliberately                           | `col.tags`                             |
| `squareFallback`           | `false` (default)                                  | `true`                                 |
| `allowLayoutDimensions`    | `false` (default)                                  | `true`                                 |

Identical: `title`, `slug`, `isClient`, `isBlog`, `description`, `coverImage`, `createdAt`,
`updatedAt`, `collectionDate`.

**One divergence is a hard type conflict, not a preference.** `CollectionModel.tags` is
`string[]` ([Collection.ts:248](app/types/Collection.ts:248)); `ContentCollectionModel.tags` is
`ContentTagModel[]` ([Content.ts:381](app/types/Content.ts:381)). No shared field mapping can read
both. A merged function must either take an already-resolved tag array — pushing the mapping back
into the call sites — or branch internally on which model it got, which is the two functions again
wearing one name.

**Two more are semantic, not mechanical.** `visible` maps a collection-level `CollectionVisibility`
enum on one path and reads a block-level boolean on the other; `id`/`collectionId` mean different
things because one model IS the collection and the other REFERENCES it. The `id ?? referencedId`
fallback exists only because synthetic PARENT collections carry null content-table ids.

**What actually duplicates is two lines** — the strip predicate,
`isPasswordProtected === true && !showProtectedCovers ? null : coverImage`. That is the entire
shared surface. Extracting it as a helper is defensible and would save nothing; keeping it visible
at both sites is worth more, for the reason `collectionToContentModel`'s docblock already gives:
it is a display decision about locked galleries, and burying it in a generic builder is how it gets
bypassed later. `buildParallaxCard` is that generic builder, and E1 already declined to put the
strip in it.

**Verdict: not worth an MR.** A merge would relocate the divergence into the call sites, not remove
it — roughly +25 lines of call-site mapping to delete ~30 lines of function body, against a real
loss in readability at the one place where an access-adjacent decision is made. This is the shape
the board flags as "the win is 'declared once instead of three times', not 'deleted'", except here
even that win is absent: the two are not three copies of one thing, they are two adapters for two
types. **No follow-up MR is filed.**

One thing that would have made a merge worse and is worth recording: it is safe on the automock
axis, but only by luck. No suite bare-mocks `@/app/utils/contentLayout` or the `CollectionPage`
module, so collapsing the two exports would not have merged their automocks. Had either been
mocked, E3's trap would have applied and nothing would have failed to tell anyone.

#### Verification

- Seven new tests in `tests/utils/contentLayout.test.ts`, covering both directions of the opt-in on
  both `convertCollectionContentToParallax` and `processContentBlocks`.
- **Three strip assertions confirmed red first** against a neutralised predicate, then green when
  restored. The fixture carries a real `coverImage` by default, so this avoided C1's trap of a test
  passing because the relevant field was `undefined`.
- `eslint --fix` → `prettier --write` → `tsc --noEmit` clean; full jest 246 suites / 4430 tests pass.
- **Not done: a `:3000` browser check** that a protected child card renders the placeholder rather
  than a cover. It needs a protected client gallery sitting inside a parent collection. The red
  tests are the gate that replaced it.

#### Follow-up that is NOT filed as an MR

The locked-tile UI the backend shipped the field for does not exist on either path. A protected
gallery's card now renders as an indistinguishable grey 1:1 placeholder — the same thing a
collection with no cover at all renders as. That is a product question (does a locked gallery
announce itself, and how), not cleanup, so it gets no row on the MR board. It is recorded here and
in `group-h-features.md`'s neighbourhood as the open half of C6.

### ✅ C7 · `emailShareLink` POSTs to an endpoint that does not exist — PR #331, 0 src

**The route shipped.** Verified against backend `origin/main` at `1b4960e`:
`UserShareControllerProd` now declares `@PostMapping("/email")` at `:115`, handler `emailLink` at
`:116`. It landed in backend PR #213 (`feat(share): email the link that is already in circulation`),
the item their board listed as next. The 404 is gone.

**The contract matches field-for-field, so the frontend needs no change to the happy path.**
Checked both sides rather than trusting the earlier claim:

|              | Frontend                                                                                              | Backend                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Request body | `JSON.stringify({ toEmail })` ([share.ts:181](app/lib/api/share.ts:181))                              | `SendShareLinkRequest(@NotBlank @Email String toEmail)` |
| Response     | `ShareEmailResult { sent: boolean; reason: string \| null }` ([share.ts:60](app/lib/api/share.ts:60)) | `ShareEmailResult(boolean sent, String reason)`         |

Delivery is best-effort on the backend and never throws, and it short-circuits while
`email.enabled` is false — so this ships without SES configured, exactly as the earlier note said.
`ShareCard`'s `handleEmail` already branches on `result.sent` and shows the copy-it-yourself message
on false. Test coverage exists too: `tests/lib/api/share.test.ts:395` has an `emailShareLink`
describe with success, not-sent, and error cases.

**So the frontend needs NO code change at all. C7 closes on verification.**

This section briefly said otherwise, and the correction is the most useful thing in it. The backend
returns `409 CONFLICT` when the owner's token cannot be recovered (minted before V58, or encrypted
under a since-changed secret), and its docblock is explicit that _"the honest answer is 'reset to get
a new one', not a silent no-op"_. Reading `handleEmail` alone, that looks unhandled: it calls
`run(..., 'Could not send that email. Please try again.')`, and that fallback string reads as
transient. **Following the path one hop further shows it is already correct.** `run` hands the raw
error to `mapError` ([ShareCard.tsx:33](app/components/Personal/ShareCard.tsx:33)), which branches on
`ApiError.status` and returns, for 409:
_"This link was created before links could be re-shown. Reset it to get one you can copy."_
`throwFromResponse` ([share.ts:18](app/lib/api/share.ts:18)) constructs that `ApiError` with
`res.status`, and `ApiError` carries `status` ([core.ts:91](app/lib/api/core.ts:91)). The chain is
whole.

**The lesson, and it is this board's own rule turned on itself: a fallback string at a call site is
not evidence that the error is unhandled.** The generic copy is the LAST branch of a mapper, not the
only one. Reading `handleEmail` and stopping there produced a confident, wrong finding that was one
`grep` from being written into this board as work. That is the same failure as C6's false premise,
committed in the same session that recorded C6's false premise.

**What was left, and what happened to it (closed 2026-08-25).**

- [x] **`mapError`'s 403 and 409 branches now have tests.** `ApiError(409)` is driven through
      `handleEmail` and `ApiError(403)` through `toggleCollection`, in
      `tests/components/Personal/ShareCard.test.tsx`. Both were watched failing first, as asked:
      stubbing `mapError` to `return fallback` as its first statement fails exactly three tests and
      leaves the other eight untouched. That is the whole item's source of confidence — it proves
      each test is bound to the branch rather than to some other string on the page.
- [x] **The "ZERO test coverage" claim directly above was itself wrong, about 401.** A 401 test has
      been there all along (`explains an expired session rather than a generic failure`), driving
      `ApiError(401)` through `handleReset`. The stub run above confirms it: it is one of the three
      that fail. **Why the earlier grep missed it — worth keeping.** That grep looked for the copy
      strings as written in `mapError`; the test asserts on the fragment `/session has expired/i`.
      Grepping a full copy string cannot find a test that matches part of it, and "nothing matches"
      was read as "nothing covers it". Only 403 and 409 were ever genuinely uncovered.
- [ ] **The live click was deliberately NOT run, and this is the one thing still open.** There is no
      local database to run it against: port 5432 is an SSH tunnel to the production EC2 box, and
      `~/portfolio-db/` (which the backend's `docker-compose.yml` names as where the DB lives) does
      not exist. The frontend has no `.env` either. Standing the backend up locally therefore points
      it at production, so the "local check" would be a production write. **And it would not have
      proven the thing anyway:** `EMAIL_ENABLED` is unset in the backend `.env`, so compose's
      `false` default wins and `sendShareLinkEmail` short-circuits — the click would exercise the
      `sent:false` path, which `says so plainly when email is switched off` already covers. Left for
      whoever next has a real environment; it is not blocking anything.

**Cost of unifying `handleEmail` / `handleReset` / `handleCopy` — reported as asked, and DECLINED.**

**First, the guardrail's own premise is off: `handleCopy` is not a `run(...)`.** It wraps
`navigator.clipboard.writeText` in its own try/catch, sets `setError` to a literal, and never
touches `mapError` or the pending phase ([ShareCard.tsx:95](app/components/Personal/ShareCard.tsx:95)).
It has no network call, no `ApiError` and no status code, so it could not join a status reducer even
if one were wanted. The three actual `run(...)` callers are `handleReset`, `handleEmail` and
`toggleCollection`.

**Second, the unification already exists.** `run(action, fallback)` is the shared reducer: it clears
`error` and `emailNote`, sets `pending`, wraps the call, hands failures to `mapError`, and sets the
phase. `mapError` is the shared status table. Between the three callers the only thing not already
shared is one fallback string each — and that string is the one thing that must differ.

**So the refactor on offer is: replace three string literals with three keys and a lookup.** Roughly
15 lines touched, zero net lines saved, one new indirection. It also moves the copy away from the
call site, so reading `handleEmail` would no longer tell you what a failed send says. Worse, a
swapped key still type-checks — every key has the same type — which is precisely the "tells someone
their link was sent when it was not" failure the guardrail exists to prevent. It converts a mistake
the compiler currently makes impossible into a silent one. **Declined; leave all four handlers
alone.**

**Second guardrail held: `throwFromResponse`, `ApiError` and `mapError` are unchanged.** The diff is
test-only — `0 src`, as forecast. Confirmed with `git diff` against `HEAD` after the stub was
reverted.
The original filing follows, which is still accurate about the UI being fully built.

#### The original filing

Found 2026-08-23 while researching the email strategy (H4). The "Send" button under Share on `/user`
404s on every click.

- [ ] [share.ts:176](app/lib/api/share.ts:176) `emailShareLink` POSTs to `${SHARE}/email`, i.e.
      `/api/read/user/share/email` (base constant at [share.ts:16](app/lib/api/share.ts:16)).
- [ ] The backend has no such route. `UserShareControllerProd`
      (`controller/prod/UserShareControllerProd.java:39`) declares exactly four mappings:
      `@GetMapping` `:50`, `@PostMapping("/rotate")` `:64`,
      `@PutMapping("/collections/{collectionId}")` `:80`,
      `@DeleteMapping("/collections/{collectionId}")` `:98`.
      **Re-verified TWICE on 2026-08-24, the second time against backend `origin/main` at
      `32f0451` (the repo moved from `4abb28e` between the two checks): still exactly those four
      mappings at those four lines, and no `/email` route anywhere under `src/`.** Three of the four
      refs above had drifted (`:67→:64`, `:86→:80`, `:107→:98`) and are corrected here; they did
      NOT drift again across the backend's own advance, so the anchors are stable.
      Cross-repo refs on this board are not covered by the frontend drift sweep — re-check them
      by hand whenever the item is picked up, and pin the backend SHA you checked against.
- [ ] The UI is fully built and reachable: input and Send button at
      [ShareCard.tsx:183-200](app/components/Personal/ShareCard.tsx:183), handler `handleEmail` at
      `:112-121`. The 404 surfaces as the generic "Could not send that email" at `:121`, so it reads
      as a transient failure rather than a missing feature.
- [ ] The `ShareEmailResult { sent, reason }` contract at
      [share.ts:60-63](app/lib/api/share.ts:60) was written against a backend that was never built.

**Ref drift in the filing above, noted 2026-08-27 — the record is kept as written, the coordinates
are not current.** C7 is shipped, so these are history rather than work, but anyone following them
should know E2 (#333) rewrote `share.ts` underneath them: it is 161 lines now, not 217.
`emailShareLink` `:176` → **`:144`**; the request body `:181` → **`:145`**, and it is now
`json: { toEmail }` through `clientFetch` rather than a hand-rolled `JSON.stringify({ toEmail })`;
`ShareEmailResult` `:60` → **`:42`**. The base constant `SHARE` at `:16` did not move.
**`throwFromResponse` left `share.ts` entirely** — E2 moved it to `core.ts:117`, so the reference to
it at `share.ts:18` now points at nothing. That symbol-took-a-walk case is the exact failure mode
this board's third principle predicts: drift concentrates where a later item shipped.

**Three claims checked, not assumed** — the C4 lesson is that a literal grep can report a live route
as dead when the real one is assembled from a template, so all three were run before filing:
(1) _Reachable in production?_ Yes. The Send button renders in the `settings.exists && shareUrl` arm
of `ShareCard.tsx` (from `:167`) with no env gate, no `isAdmin` gate and no feature flag; it enables
as soon as the input is non-empty. (2) _A mapping built from a constant or template?_ No. On backend
`origin/main` every mapping annotation under `src/main/java/**/controller/**` is a plain string
literal; the only four that are not bare `Mapping("…")` are `@PostMapping(value = "/literal",
consumes = …)` forms, still literals. There is nowhere for a template-assembled route to hide.
(3) _A sibling controller that could catch it?_ There is a second share controller,
`ShareControllerProd.java` at `@RequestMapping("/api/read/share")`, but it cannot match — the
frontend posts to `/api/read/user/share/email`, and `/api/read/share` is not a prefix of that.
Verified against backend `origin/main`, not a working branch.

The fix is a decision, not a patch: build the handler — `EmailService` already has a working send
path to reuse — or hide the input until it exists. **Do not "fix" it by swallowing the error**; that
converts a visible 404 into a silent no-op, which is strictly worse. Whichever way it goes, it is
paired with H4's decision 2, since both are about whether this app sends mail on a user's behalf.

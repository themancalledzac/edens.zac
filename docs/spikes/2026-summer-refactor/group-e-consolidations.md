# Group E — Consolidations (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

E1–E5, E8, E10, E11 and E12–E17 are archived here, plus the shipped halves of E6, E7 and E9. E6,
E7 and E9's open remainders (and E18, filed 2026-08-29) are on the live board.

## Closed rows

| MR  | Scope                                                                    | Outcome                                                                                                     |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| E1  | Parallax-card builder consolidation                                      | +98 src, +659 test (est. −120) · #269                                                                        |
| E2  | `core.ts` fetch skeleton + `clientFetch`                                 | −115 src actual, +6 tests (est. −180 src, +150–200 test) · #333 (bullets 1–2) + #334 (bullets 3–4)           |
| E3  | `collectionStorage.ts` generics                                          | −12 src (−46 code, +39 comment); +927 test via #296 · #306 — guards answered by #306 itself in `collectionStorage.ts:47-55`, keep them |
| E4  | Entity-diff generics + one IMAGE guard                                   | +44 src / +177 test for the twins half (est. −80) · #311 — IMAGE-guard half STRUCK, guards are NOT duplicates |
| E5  | Filter/sort/date duplication                                             | 0 src / +139 test (est. −50 src) · #299 — all 4 "open" bullets shipped in #299 itself (swept 08-28)          |
| E8  | Renderer + `MenuDropdown` dedup                                          | −49 src / +90 test (est. −120 src / +150–250 test) · #319                                                    |
| E10 | Admin panel dedup (`LoadError`, `.viewAll`, literals, comparator)        | −79 src code-only / +176 test code-only (est. −60 src) · #304 — 5 of 7 shipped, 1 never a task, `--color-danger` kept by user decision |
| E11 | Make cache-tag register/revalidate drift detectable                      | +277 −28 · #280                                                                                              |
| E12 | Wire up `collections-location-${slug}`                                   | +72 src / +293 test (est. +30 src) · #301 — image-path trigger split out as E13                              |
| E13 | Trigger `collections-location-${slug}` from the image-metadata save path | +36 src net / +165 test (est. +30 src, +60 test) · #313 — location-RENAME gap split out as E16               |
| E14 | `createHeaderRow`'s `_chunkSize` is dead but receives a live value       | −3 src / −4 test net, 36 call sites · #307 — the one estimate on this board that held                        |
| E15 | `createHeaderRow`'s two trailing boolean params → options object         | +22 src net / 14 test call sites (est. ±15 src, ~20 sites) · #314 — stacked on #313; first call-site estimate to come in OVER |
| E16 | Revalidate the OLD slug when a location is RENAMED                       | +40 src / +281 test across 2 slices (est. +30 src / +120 test) · #316 + #317 — src held; test half 2.3x over |
| E17 | Collapse the inert `pageType` union to a boolean                         | +3 src (−2 code, +5 comment) / +9 test (est. −15 src / ~0 test) · #322                                       |

---

### ✅ E1 · Parallax-card builder consolidation — PR #269

- [x] The builder exists in four places. Plan executed as written:
      `docs/superpowers/plans/2026-08-04-parallax-card-builder-consolidation.md`. New
      `app/utils/parallaxCard.ts` owns `buildParallaxCard`; the four call sites are thin adapters.

**The board's framing was wrong and the plan's was right.** E1 is NOT the fix for the password-strip
divergence — the plan explicitly puts that out of scope so the refactor stays a provable no-op. The
divergence is real and is now **C6**, split out. E1 delivered consolidation, not the correctness fix.

**The plan's divergence table was incomplete in three ways**, all found by writing the
characterization tests first:

1. `convertCollectionContentToParallax` reads dimensions via `pickImageDimensions`
   (`imageWidth ?? width`), so it also accepts the layout `width`/`height` fields; the other three
   read `imageWidth`/`imageHeight` only. `Content` carries `width`/`height`, so this is reachable in
   principle. Preserved as the opt-in `allowLayoutDimensions`, NOT silently unified.
2. It also carries `rating`, `createdAt` and `updatedAt`, none of which the table listed.
3. `collectionToContentModel`'s visibility mapping has an `undefined -> true` special case the table
   flattened to `visibility === LISTED`.

**Estimate was −120 source; actual is +98 source, +659 test.** The builder's docblocks carry the
option rationale that used to be nowhere, and the plan mandates a characterization suite. A
consolidation that documents its own divergences does not shrink the tree — do not expect E-group
items with written plans to come in negative.

- [x] `clampParallaxDimensions` + `extractCollectionDimensions` moved into `parallaxCard.ts` to break
      the import cycle (`contentLayout` would otherwise import the builder that imports it back).
      `contentLayout` re-exports `clampParallaxDimensions`, so `adminHubContent.ts` and
      `contentLayout.test.ts`'s existing describe are untouched.
- [x] `collectionToContentModel` was module-private; exported so it could be characterized directly
      rather than through a rendered page.
- [x] 26 characterization tests (committed BEFORE any migration) + 22 builder unit tests. The
      characterization file passes unmodified through the migration apart from one fixture line
      adding a required `slug` to a tag — no assertion changed.

**Not done: the plan's Task 6 browser spot-check.** :3000 serves the primary checkout, which another
agent held on `0251-collections-panel`; a second dev server would have meant editing their
`launch.json`. Characterization-unmodified is the substitute evidence, but no DOM diff against `main`
was run. Worth doing before merge if the parallax grid matters.

### ✅ E11 · Make cache-tag register/revalidate drift detectable — PR #280

**Shipped as a test and nothing else: `tests/lib/api/cacheTagDrift.test.ts`, ~205 lines, zero source
change.** It reads both halves out of the source at run time — the `next: { tags: [...] }` options in
`lib/api`, and the tags named inside the two revalidate helpers — and asserts the sets agree, with an
allowlist for tags that are one-sided on purpose.

- [x] What a constants module cannot do, established before designing anything: three of the six
      registered tags are template strings, so no compile-time check can pair a registration with a
      revalidation. The goal is detectable drift, not impossible drift, and the shipped test says so
      in its own docblock.
- [x] **The answer to "does the constants module earn anything on top of the test": no.** It was the
      instinct this item was filed to slow down, and slowing it down was right. A constants module
      moves the six tag strings into one file, but the template tags still get assembled at the call
      site, so the two halves can still drift and the same test is still the only thing that notices.
      It would add a layer of indirection and leave the actual check exactly where it is. If a
      seventh tag ever arrives that is a plain literal used in three places, revisit — until then the
      module is motion, not progress.
- [x] Template tags handled as the central case rather than an exception. `isRegistered` matches a
      literal against template prefixes, which is what pairs `collection-home` with
      `collection-${slug}`. There is a dedicated test pinning that pair.
- [x] Fails loudly. Every assertion is a set-difference rendered as a list of sentences, so the
      failure output names the tag, the file, what is wrong, and both ways out. No bare
      `expect(a).toEqual(b)` diffs.
- [x] **Guarded against passing vacuously.** A text scanner that quietly stops matching would make
      every other assertion trivially true, which is worse than no test at all. One case asserts the
      scan floors — at least six registrations, at least four revalidations, at least one template.

**All five assertions were confirmed red before this shipped.** A drift test that has never been
seen to fail is a decoration, and this one is aimed squarely at a silent failure mode.

| Simulated drift                                            | Assertion that caught it                     |
| ---------------------------------------------------------- | -------------------------------------------- |
| Registration regex stops matching                          | vacuity floors                               |
| `content-people` re-added to `revalidateMetadataCache`     | revalidated-but-unregistered                 |
| Allowlist entry for `collections-location-${slug}` deleted | registered-but-unrevalidated                 |
| Allowlist entry added for a tag that is actually connected | stale-allowlist                              |
| Template matching replaced with literal comparison         | template pairing, plus a false orphan report |

That last row is the one worth keeping. With template matching removed, the test reports
`collection-home` as revalidating nothing and advises deleting it — reproducing C4's exact false
positive, in a check whose whole purpose is preventing it. A drift test built on literal comparison
would have been confidently wrong, which is why the pairing has its own test.

**Known limits, stated rather than papered over.**

- It is a text scan, so it is coupled to how the source is written. Splitting a `next: {}` option
  across lines in a shape the regex misses breaks the scan — the vacuity floors turn that into a
  loud failure rather than a silent pass, which is the trade being made.
- It only reads the two revalidate helpers and `lib/api`. A tag registered or revalidated somewhere
  new is invisible to it. `/api/revalidate` takes its tags from the request body and cannot be
  scanned; `clearCacheAction` uses `revalidatePath` and has no tags at all.
- Prefix matching means a registered `collection-${slug}` covers any revalidated tag starting with
  `collection-`. A genuinely wrong tag like `collection-typo-here` would pass. This is the failure
  mode C4's guardrail describes for `collections-location-${slug}`, and no static check can catch
  it — the slug is a runtime value.

---

### ✅ E2 · `core.ts` fetch skeleton + `clientFetch` — CLOSED 2026-08-26 (#333 bullets 1–2, #334 bullets 3–4)

- [x] **`throwFromResponse` now lives once, in `core.ts`**, imported by `auth.ts`, `personal.ts`,
      `share.ts` and `selects.ts`. Those four were confirmed byte-identical before the move — by
      brace-matched extraction and diff, not by eye — so the fold is mechanical. `tests/lib/api`
      passed unchanged (290 tests), and `auth.ts` dropped its now-unused `ApiError` import.
- [x] **`clientFetch` / `clientFetchJson` now carry the raw client-fetch skeleton**, in `core.ts`.
      17 call sites across `auth.ts`, `personal.ts`, `share.ts` and `selects.ts` collapsed from a
      nine-line block each to one or two lines. **Net −57 src** (callers −117, helpers +60) — the
      "~60 lines" estimate was right, the first one on this board that has been.
- [x] **Three copies of the fetch skeleton inside `core.ts` are now one.** `fetchBase` takes the
      channel as its first argument (`typeof READ | typeof ADMIN | typeof EDIT`); `fetchReadApi` and
      `fetchAdminGetApi` are three-line delegates. **Net −58 src** in `core.ts` (436 → 378 lines).
- [x] **`Content-Type` dropped on GETs; identity map deleted; each failure path now reaches
      `throwApiError` once.** `ENDPOINT_TYPE_TO_CHANNEL` is gone — `fetchBase` passes the channel
      straight to `buildSimpleApiUrl`. The double-`throwApiError` shape is gone with the single
      try/catch: a rejected `fetch` and an unparseable body each route through
      `.catch(throwApiError)`, and the non-OK branch throws without being re-caught and re-thrown.

**Bullets 3 and 4 verified 2026-08-26, and for once every claim in them is TRUE.** Worth saying
plainly, because the last three items each had a false premise and the lesson must not become
"assume the board lies":

- Three fetch skeletons in `core.ts` — `fetchReadApi`, `fetchBase`, `fetchAdminGetApi`. (There is
  now a fourth `await fetch(` in the file; that is `clientFetch` from bullet 2, not a skeleton.)
- `fetchAdminGetApi` really is `fetchReadApi` with a different channel constant. Same try/catch,
  same cookie forwarding, same 204→`null`, same `throwApiError` pair. The only difference is
  `buildSimpleApiUrl(ADMIN, …)` vs `(READ, …)`, plus a comment.
- `ENDPOINT_TYPE_TO_CHANNEL` really is an identity map: `{ admin: ADMIN, edit: EDIT }` where
  `ADMIN = 'admin'` and `EDIT = 'edit'`.
- The `Content-Type` on GETs is real: `fetchReadApi` and `fetchAdminGetApi` both set it
  unconditionally, on bodyless GETs included. `fetchBase` does not.

**But bullets 3 and 4 are ENTANGLED and cannot be done independently, which the board presents them
as being.** The fold in bullet 3 is only possible because `fetchBase` is otherwise identical — and
`fetchBase` does NOT set the default `Content-Type`. So delegating `fetchReadApi` /
`fetchAdminGetApi` to `fetchBase` **drops that header as a side effect**, which is bullet 4's first
clause. Doing 3 does part of 4 whether or not you meant to.

**And the drop is not free: four assertions in `core.test.ts` pin that header** (`:290`, `:314`,
`:512`, `:533`), all on `fetchAdminGetApi`. They will go red. That is the correct outcome — a
bodyless GET advertising a JSON body is meaningless to the backend — but it has to be an
intentional edit to four tests, not a surprise during a mechanical fold. **Whoever takes this must
decide the header question FIRST and update those assertions deliberately.** Blast radius if the
signature changes: 16 `fetchReadApi` call sites and 16 `fetchAdminGetApi` call sites. Keep both
exported wrappers so the call sites do not move.

**Why bullets 3–4 are next (picked 2026-08-26).** Their context is as warm as it will ever be —
every claim in them was just re-verified line by line, the entanglement above was just mapped, and
the four pinned assertions are named. Nothing about them is unanswered. They are also the last of
E2, so finishing them closes an item rather than advancing one.

**Do them as ONE MR, not two.** The board lists them separately and that is the trap: the fold in 3
drops the header in 4 as a side effect, so splitting them means shipping an MR whose tests you had
to edit for a reason its own description does not contain.

**Guardrail — keep both exported wrappers, and report what removing them would cost.**
`fetchReadApi` and `fetchAdminGetApi` should become thin delegates to `fetchBase`; they should NOT
be deleted in favour of pushing `fetchBase('read', …)` out to their 32 call sites. That change is
tempting once the bodies are gone and the wrappers look like pure indirection, but it turns a
~40-line edit inside one file into a 32-site churn across seventeen, and the call sites are the part
this item has no reason to touch. If it still looks right after the fold, write down what it would
cost instead of doing it.

**Second guardrail — do NOT fold `collections.ts` / `users.ts` into the shared helper.** They now
have tests, and a session in `core.ts` will read that as permission. It is the opposite: those tests
exist to PIN a difference that was previously invisible, not to license removing it. Both are
user-facing copy — the gallery-password 404 and what an invitee sees on a bare error code — so the
fold is a product call, and it is listed as BLOCKED on the user for that reason.

**"exists six times — keep one copy" was wrong about two of the six, and that is this item's main
finding.** The inline handlers in `collections.ts` and `users.ts` are near-identical, not identical.
Each carries a deliberate behaviour difference, and **neither difference was pinned by any test**:

| Where                                                                                | How it differs from the shared helper                                                               | Pinned before?                                |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `validateClientGalleryAccess` ([collections.ts:188](app/lib/api/collections.ts:188)) | Overrides the backend's own message on 404 with `'Gallery not found'`                               | No — the 404 test asserted status only        |
| `acceptInvite` ([users.ts:248](app/lib/api/users.ts:248))                            | Object body with no `message` → `API error: <status>`; the shared helper → `JSON.stringify(detail)` | No — every test supplied a `{ message }` body |

So folding either one in would have changed behaviour **with a green suite** — the unguarded-rewrite
hazard E3 recorded, arriving one item later in a different disguise. They are deliberately NOT
folded here. Both are now characterized, and the guards were checked the way C7's were: mutating
each handler to match `core.ts` fails exactly those two tests and nothing else.

**"~14 functions" was also undercounted: there are 22 raw client fetches**, not counting
`core.ts`'s own three skeletons (those are the next bullet). 17 converted; **five deliberately did
not**, and they are the same shape of exception each time — a non-OK status that is _data_, not an
error. `me()` and `meServer()` return `null` on 401, `getInvitePreview` maps 410 and everything else
to a status object, and the two divergent handlers above own their error copy. Routing any of them
through a helper that throws would mean catching an exception to recover a value the response
already gave us, so `clientFetch`'s docblock names them as out of scope rather than leaving the
omission to be rediscovered.

`clientFetch` takes `json` instead of `body` on purpose: every caller sends JSON or nothing, and
accepting both would put "did I set the Content-Type" back at the call site. Its four defaults —
`credentials`, `cache`, the JSON header, and the throw — are pinned in `core.test.ts`, and the
guard was mutation-checked: deleting `credentials`/`cache` fails that test and nothing else. None
of the 4,445 existing tests would have caught it, because a dropped `credentials` does not fail a
suite, it logs the user out in a browser.

**The shared helper also had no direct tests anywhere, despite four callers.** `core.test.ts` now
pins its contract — status carried onto the `ApiError`, text body verbatim, JSON `message`
preferred, whole body stringified when there is no `message`, status fallback when the body will
not parse. The stringify case is written as the explicit counterpart to `users.ts`'s divergence, so
the two read as a difference rather than as drift.

**Whether to unify the last two is a behaviour call, not a cleanup**, and it wants an owner: the
404 override is user-facing copy on the gallery-password screen, and `acceptInvite`'s fallback
decides what an invitee sees when the backend sends a bare error code. Left open deliberately
rather than folded on the board's say-so.

#### Bullets 3–4, shipped (PR #334, **merged to `main` 2026-08-27, confirmed via `gh pr view`**) — the `Content-Type` decision and what it cost

**The header was dropped, and the decision was made before the fold rather than discovered during
it**, as this item required. Three reasons, checked rather than assumed:

- **All 32 call sites are bodyless GETs.** Not one of the 16 `fetchReadApi` or 16 `fetchAdminGetApi`
  callers passes a `method`, a `body`, or a `headers` option. The header described a request body
  that never existed on any of them.
- **The file's other wrappers already follow the opposite rule.** `fetchBase` never set a default;
  each write wrapper sets `Content-Type` because it has a body, and `fetchAdminFormDataApi`
  deliberately omits it so the browser can fill in the multipart boundary. Dropping the GET default
  makes one rule hold across the whole file instead of two.
- **The BFF proxy does not branch on it for GETs.** `app/api/proxy/[...path]/route.ts:124` reads
  `content-type` only to pick the 16 KB / 25 MB size cap, and only for write methods.

**The board said four assertions pinned the header. Three did.** `core.test.ts:290`, `:314` and
`:512` are the real ones, all on `fetchAdminGetApi`. `:533` is on `fetchAdminPostJsonApi` — a POST
whose `Content-Type` comes from the wrapper's own `headers`, not from the skeleton — so it was never
affected and stayed green throughout. The miscount is minor, but it is the same species as the
earlier ones: a number read off a grep rather than off the code path.

**The three were rewritten as positive absence assertions, not deleted.** A deleted assertion leaves
the new behaviour unguarded, which is the hazard E3 recorded. Each now asserts the exact header
object, and two new tests assert `not.toHaveProperty('Content-Type')` directly.

**`fetchReadApi` had no direct coverage in `core.test.ts` at all** before this, despite 16 callers —
the fold changed it as much as it changed `fetchAdminGetApi`. Four tests now pin its channel, its
absent header, its error conversion and its 204. Suite: 303 → 309 in `tests/lib/api`, 4,451 passing
overall.

**Both guards were mutation-checked.** Re-adding the `Content-Type` default fails exactly seven
tests and nothing else; pointing `fetchReadApi` at `ADMIN` fails exactly four. Neither mutation is
caught by any other suite.

#### Deletion cost of the two wrappers — measured, not done

The guardrail said to keep `fetchReadApi` and `fetchAdminGetApi` and write down what removing them
would cost. Measured after the fold, with the bodies gone and the wrappers looking like pure
indirection:

| What it would touch                   | Count                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Call sites to rewrite                 | 32 (16 `fetchReadApi`, 16 `fetchAdminGetApi`)                                    |
| Source files                          | 16 — six `app/lib/api/*`, plus `app/(admin)`, `app/explore`, and four components |
| Test files that mock them by name     | 12                                                                               |
| Lines actually deleted from `core.ts` | ~14                                                                              |

**The test files are the part the "32 sites across seventeen files" estimate missed, and they are
the reason not to do it.** Twelve suites mock these wrappers by name
(`jest.mock('@/app/lib/api/core', …)`, then `expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/roles')`).
Deleting the wrappers forces every one of them to mock `fetchBase` and assert on a channel string
instead of a named function — trading an assertion that reads "this module GETs `/roles` from the
admin channel" for one that reads "this module called the generic fetcher with `'admin'`". That is
strictly weaker coverage bought with a 32-site churn to delete fourteen lines.

**It would also widen the public surface of `core.ts`.** `fetchBase` is module-private today. Export
it and the channel becomes a caller's choice at 32 sites, where a wrong constant routes an admin
read through the public read channel — a mistake the type system permits and no test would catch.
Recommendation: keep both wrappers permanently, not just for this MR.

### ✅ E3 · `collectionStorage.ts` generics — CLOSED 2026-08-28; the guards question was already answered in code by #306

**The guards bullet was never a user decision, and it has been sitting BLOCKED for four days
against an answer that #306 itself wrote into the source.** `collectionStorage.ts:47-55` states it
outright: the `cached.slug !== slug` check is deliberate and is NOT dead code. It is unreachable
through the module's own API — the key is `prefix + slug`, injective over string slugs, and `set`
always files the slug it was given — but it IS reachable from outside: a foreign write to the same
key (devtools, a stale entry from an older key scheme), or a plain-JS caller passing a non-string
slug, where `JSON.parse` restores `42` and `42 !== '42'`. Dropping it makes `get` return
`cached.data`, which for a foreign payload can be `undefined`, **violating the declared `T | null`
return without TypeScript noticing**, because the value arrived through `JSON.parse`. The eviction
is pinned by `tests/lib/storage/collectionStorage.test.ts` (mutation M3).

**Answer: keep the guards. Zero code. E3 is closed.**

**This is the SIXTH occurrence of the board's dominant failure mode, and the worst-shaped one yet.**
The previous five were shipped-but-unticked. This one is _answered-but-still-blocked_: the guardrail
on #306 said "carry the guards through unchanged and put the deletion analysis in the PR body", the
PR did exactly that — into a source docblock rather than the board — and the board kept the question
open anyway. **Rule, hoisted: when a guardrail says "report what changing X would cost", go read
where that report landed before re-asking the question.** It is usually in the PR body or in a
docblock the PR added, not in the board.

#### The original filing, kept for history

**SHIPPED 2026-08-24, generics half only — PR #306, −12 net in `collectionStorage.ts`.**
`createSlugCache<T>(keyPrefix, suffix)` now builds both trios, so the SSR guard, the slug-match
guard, the TTL rule and the error handling are written once. Executable code went 173 → 127 lines
(−46, −27%); comments went 74 → 113 (+39) carrying the two rationales below. The guards were carried
through unchanged, exactly as the guardrail required, and M3 confirmed it (see below).

**The "halves the file (~100 lines)" estimate was wrong, and here is the failure mode.** It halved
the file's 286 total lines. Only the two trios dedup — 173 lines of code across both — and
`clearAll`, `updateImagesInCache`, the imports and the envelope type do not. Real saving: 46 code
lines. **Generalize this to every remaining dedup item (E4, E5, E8, E10): size the duplicated
region, not the file.** This is a different bias from the source-only-vs-test-coupling one already
on this board, and it stacks with it — E3's row estimated +50–150 net "characterize first", while
the characterization alone came in at +927.

**Two traps found in the rewrite, both now documented in the source.**

1. _The suite pins exact logger text_ (`collectionStorage.test.ts:792` asserts
   `'set: failed to write cache for slug: wedding'`), and the messages vary on **two** axes at once —
   the method name (`set` vs `setFull`) and the noun (`cache` vs `full cache`). The factory takes
   `suffix: '' | 'Full'` and rebuilds each message so all seven stay byte-identical to the originals.
2. _`update`/`updateFull` must NOT become `update: plainCache.set`._ Seven suites automock this
   module with a bare `jest.mock(...)`, and jest's automocker gives two properties holding the same
   function reference the **same mock**. Probed directly: under the alias variant
   `collectionStorage.update === collectionStorage.set`, and a `set()` call lands in `update`'s call
   list. **Honest severity: this does not break the suites today** — all 18 `ContentCollection`
   suites pass 400/400 against the alias variant. It is a latent trap, not a live failure, and
   `useCollectionEdit.handlers.test.tsx` asserts on `update`/`updateFull` call order, so it would
   start counting `set` calls as `update` calls the first time one of those paths also calls `set`.
   Hoisted into "How to use this doc" — it applies to every twin-collapse item.

**M3 re-verified against the refactored source: 6 failed / 82 passed**, up from 4 on `main`, because
the collapsed guard now serves both `get` and `getFull`. The safety net got tighter, not looser.

**Why it was next.** PR #296 was written specifically as this item's characterization safety net, so
its context is as warm as it will ever be. That suite pins `update`/`updateFull` separately from
`set`/`setFull`, pins every key prefix by literal string, and carries a mutation (M2) that simulates
this exact refactor going wrong. Do not start E3 before #296 is on `main`; without it this is an
unguarded rewrite of a storage layer.

**Guardrail — leave the `cached.slug !== slug` guards alone in this MR, and report what deleting
them would do.** The generics half is COLD and needs no decision. The guards half is a behavior
change with a user call attached (see the rewritten bullet below), and bundling the two makes the
diff impossible to review: a reviewer cannot tell a generic-collapse bug from an intentional guard
removal. Ship the generics with the guards carried through unchanged, and put the deletion analysis
in the PR body. If the analysis says removing them is safe, that is a second, one-line MR that the
reviewer can actually see.

Mutation M3 in the #296 suite is the test that goes red if you touch them. If it goes red in this
MR, you have gone out of scope.

- [x] `update`/`updateFull` are literal aliases of `set`/`setFull`. The `get`/`set`/`clear` pairs differ only in key prefix and type — one generic pair halves the file (~100 lines). **Done, PR #306 —
      but the two halves of this bullet resolved differently.** The trios collapsed as described.
      `update`/`updateFull` did NOT: they stay as their own delegating functions, because aliasing
      them merges their jest automocks (trap 2 above). "Literal aliases" was true of the source and
      false of what the test suite can distinguish.
- [ ] ~~The `cached.slug !== slug` checks can never fire. Remove them.~~ **Half wrong — reworded
      2026-08-23 from PR #296's characterization work, which proved both halves.**
      _Unreachable through the module's own API:_ confirmed, and proven rather than assumed.
      `getStorageKey` concatenates onto a fixed prefix so it is injective; `set` always writes the
      same slug it keys on; the two prefixes cannot alias (`collection_full_cache_` does not start
      with `collection_cache_`); and nothing outside `collectionStorage.ts` writes those keys — all
      six callers go through the module API. A test drives seven adversarial slugs, including
      `collection_cache_a`, `full_cache_x`, `''` and `a/b`, and none trip it.
      _But it is not dead code._ It fires on a foreign write to the same key — devtools, a stale
      entry from an older key scheme, a future module — and on a plain-JS caller passing a non-string
      slug: `set(42, …)` then `get('42')` trips it. Removing it changes `get` from "evict and return
      null" to "return `cached.data`", which for a foreign payload can be `undefined`. That silently
      violates the declared `CollectionModel | null` return, because the value came through
      `JSON.parse` and TypeScript never sees it.
      **So E3 may still delete them — as an intentional behavior change, reviewed as such, not as
      removing unreachable code.** Mutation M3 in `tests/lib/storage/` is the test that goes red; if
      the decision is to delete, update those four tests in the E3 PR rather than treating them as a
      regression. ⛔ USER DECISION.

      **⛔ BLOCKED on one yes/no from the user. The question: delete the two `cached.slug !== slug`
      guards, or keep them?** The analysis is finished and shipped in #306's body — nothing further
      needs investigating, and no code needs reading to answer it. Everything else in E3 is done, so
      this is all that holds the item open.

      _Recommendation: keep them._ The cost is four lines. The benefit is that `get` cannot return
      `undefined` through a `CollectionModel | null` signature, which is the one failure the type
      system cannot catch here because the value arrives via `JSON.parse`. Deleting them buys
      nothing measurable and removes the only check on a payload the module did not write.
      If the answer is delete, it is a one-line MR plus four test updates, and M3 is the test to
      re-point rather than treat as a regression.

      After #306 the guards live in **one** place, not two — `createSlugCache`'s `get` serves both
      caches — so deleting them is now a single edit and M3 goes red on 6 tests, not 4.

### ✅ E4 · Entity-diff generics — PR #311; twins shipped, IMAGE-guard half STRUCK from scope

**Why it is queued next after G4.** Both refs verified correct against `main` 2026-08-24 (`contentFilter.ts:68`,
`contentTypeGuards.ts:23` — neither drifted). It is the same generic-collapse shape E3 just proved,
so the technique is warm, and the second bullet is clean subtraction with no decision attached.

**Guardrail — do NOT consolidate the two IMAGE guards as if it were a rename. They are not
duplicates, and the board's wording invites exactly that mistake.** Checked 2026-08-24:

|            | `isImageContent` (contentFilter.ts:68) | `isContentImage` (contentTypeGuards.ts:23)                                      |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Parameter  | `AnyContentModel` (typed)              | `Content \| unknown` (untyped)                                                  |
| Predicate  | `contentType === 'IMAGE'`              | object-ness **and** `contentType === 'IMAGE'` **and** `'imageUrl' in candidate` |
| Call sites | 20                                     | 21                                                                              |

The `imageUrl` requirement is not incidental — `contentTypeGuards.test.ts` has a dedicated test,
"returns false for IMAGE contentType but missing imageUrl", so it is pinned behavior. One is a
type-level narrow over a known union; the other is a runtime shape validator for data that may not
be typed at all. **Swapping `isContentImage` in at `isImageContent`'s 20 call sites adds an
`imageUrl` presence check to every one of them.** That is a behavior change, not a consolidation,
and it is the same failure B3 caught: two separately written functions that look like one
copy-pasted pair.

Related and worth reading first: `isDateable` ([contentFilter.ts:1002](app/utils/contentFilter.ts:1002))
documents that `convertCollectionContentToParallax` stamps child-collection cards
`contentType: 'IMAGE'`, so "the plain image check would admit them". The codebase already excludes
those via `isCollectionCard` (slug presence), deliberately keyed that way so it "can never disagree
with the layout/badge code". Do not re-solve that with the guard.

**So E4 splits, and the second bullet is the safe one to do first.** The `tagUtils`/`locationUtils`
generic is COLD with no decision attached. The IMAGE-guard bullet now carries a question that is
**the user's or a reviewer's, not a research one**: should those 20 sites start requiring `imageUrl`?
If yes, it is a behavior change needing its own tests; if no, the two guards are correctly distinct
and this bullet should be struck rather than shipped.

Apply the estimate lesson from E3 before sizing: measure the duplicated region, not the files.

- [x] ~~`isImageContent` vs `isContentImage`~~ — **STRUCK 2026-08-24, user decision.** The guards are
      not duplicates (see the table above), and the user confirmed it rather than leaving it open.
      Consolidating would add an `imageUrl` presence check to 20 call sites, which is a behavior
      change, not a consolidation. Nothing to ship; the two guards are correctly distinct.
- [x] `tagUtils.ts` / `locationUtils.ts` twins → `entityUtils.ts` — PR #311.

**Shipped 2026-08-24 (PR #311).** `convertToModels<T>` and `buildEntityDiff` now live in
`app/utils/entityUtils.ts`; `tagUtils` and `locationUtils` are wrappers that fix the type and keep
their exported names, so all four call sites and both existing suites pass untouched.

`buildEntityDiff` did NOT need a type parameter — its body reads only `.id` and `.name`, and both
concrete models are assignable to `EntityRef`. Only `convertToModels` is generic, and it takes a
`createUnknown` factory instead of casting its constructed fallback to `T`: a cast would silently
absorb a new required field on `ContentTagModel`, where the factory breaks at the wrapper.

**Second not-a-duplicate, found while doing this — do not fold it in later.**
`buildAssociationDiff` ([metadataUtils.ts:305](app/components/Metadata/metadataUtils.ts:305)) is a
THIRD prev/newValue/remove implementation and reads like the same function. It is not:

|                   | `buildEntityDiff`                 | `buildAssociationDiff`                    |
| ----------------- | --------------------------------- | ----------------------------------------- |
| Emits a diff when | new names differ **positionally** | the edited set holds **any** unsaved name |
| ~~`id` type~~     | ~~`number` (required)~~           | ~~`number \| undefined`~~                 |
| `prev` built from | a `Set` — duplicates collapse     | a raw array — duplicates survive          |
| Shape             | returns a value                   | mutates `diff[field]` in place            |

Given identical unsaved names on both sides, `buildEntityDiff` returns `undefined` and
`buildAssociationDiff` emits a write. Same failure mode as the IMAGE guards and as B3. The warning
is pinned in `entityUtils.ts`'s own docblock, not only here.

**Two rows of this table were wrong, corrected 2026-08-24 while doing E13.** The `id` row is struck:
`buildAssociationDiff`'s signature says `id?: number` but every model reaching it declares
`id: number` required, so the loose branch is unreachable. The `prev`-dedup row was missing and is
the only divergence with a reachable trigger. **And the sentence that used to close this paragraph
— "Moving its callers onto the shared helper changes which saves fire" — was overstated and is
deleted.** It does not: the image save path calls `updateImages` unconditionally, so a diff decides
payload contents, not whether a save happens. The full report, including why the both-sides check
is nevertheless load-bearing on the COLLECTION path, is in E13.

**Estimate, measured after the fact.** Board said −80 (which included the now-struck guard half).
Actual for the twins half: **source +44 lines**, +177 test. The duplicated region really was ~105
lines collapsing to ~55, but the shared module needs its own docblocks and `EntityRef`/`EntityUpdate`
need declaring, and those exceed what the wrappers gave back. The win is one copy of the mechanic
instead of two, not a smaller tree — the same lesson E3 taught, in the same direction.

### ✅ E5 · Filter/sort/date duplication — PR #299, COMPLETE (the four "open" bullets shipped in #299 itself)

**CLOSED 2026-08-28. Nothing was open; nothing needed doing.** All four unticked bullets shipped in
commit `699441b`, which is inside PR #299 — **the very PR the row credited while calling them
open.** `git merge-base --is-ancestor 699441b HEAD` → yes. Verified individually against `main` at
`fed67e8`:

| Bullet                                                         | Evidence it shipped                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createMetadataTextBlock` / `createTextOnlyHeaderRow` literals | Extracted to `buildHeaderTextBlock` (`contentLayout.ts:498`), called at `:534` and `:580`. Neither function holds a `ContentTextModel` literal now. The `-2` sentinel is named: `HEADER_TEXT_CONTENT_ID` at `:491`                                                                             |
| `ImageBlock` alias declared twice                              | Both declarations deleted. `grep -rn "type ImageBlock" app tests` returns nothing. `useFullScreenImage.tsx:16` and `FullScreenModal.tsx:22` use `ViewableContent` directly                                                                                                                     |
| `buildImageFilterParams` (~30 lines)                           | `content.ts:90-116` = **27 lines**, estimate was good. Called at `:129` (`searchImages`, csv) and `:316` (`getAllImages`, repeat). Endpoints stayed separate as required, and csv-vs-repeat is an explicit parameter with no default                                                           |
| `ProcessContentOptions.displayMode` ignored                    | REMOVED, not honored. The interface (`contentLayout.ts:60-99`) has no such field. Pinned by a docblock at `tests/utils/contentLayout.test.ts:1375`. **Do not confuse it with `processContentBlocks`'s own `displayMode` at `contentLayout.ts:412`, read at `:419` — that one was always live** |

**FIFTH occurrence of the shipped-but-unticked failure, and this one is the worst shape yet:** on
B8 the row was at least ambiguous, here the row named the exact PR that did the work and still
called the work open. **The check that would have caught it in one command is
`git show --stat <sha>` against the bullet list** — the shipping commit's own diffstat named every
bullet, in both E5 and E10. Added to "how to use this doc".

- [x] `FILTER_PARAM_KEYS` in `useFilterUrlState.ts` hand-mirrors `serializeFilterToParams`; the "MUST mirror" comment is a drift warning. Export the key list from `contentFilter.ts`.

- [x] `FILTER_PARAM_KEYS` in `useFilterUrlState.ts` hand-mirrors `serializeFilterToParams`; the "MUST mirror" comment is a drift warning. Export the key list from `contentFilter.ts`.
- [x] ~~`sortContent.ts` / `sortByDate.ts` mirror `contentFilter`'s merge/sort pair~~ — STRUCK
      2026-08-22: false. `sortContent.ts` _imports_ `isDateable`/`mergeDateSortedImages` from
      `contentFilter` and `sortByDate` from `sortByDate.ts`; its own docblock documents the
      placement as an import-cycle necessity. There is no duplicate.
- [x] ~~`collectionDates.ts`'s `MONTH_NAMES` duplicates `formatDateRange.ts`'s `MONTHS_LONG` (`:34`)~~
      — **the 2026-08-22 correction was itself wrong, twice over** (found 2026-08-23, PR #299).
      `collectionDates.MONTH_NAMES` is the **short** list, byte-identical to
      `formatDateRange.MONTHS_SHORT` at `:24` — not `MONTHS_LONG` at `:34`. And the parenthetical
      claiming the short lists were distinct was also false. The dedup was right; only the
      description was wrong. A ref can drift twice: re-read it even when a prior session says it
      already corrected it.
- [x] ~~`createMetadataTextBlock` / `createTextOnlyHeaderRow` are near-identical literals.~~ **Shipped in #299 (`699441b`)** — `buildHeaderTextBlock` at `contentLayout.ts:498`.
- [x] ~~`rowCombination` re-derives AR formulas that `affineHeight.ts` already exports~~ — STRUCK
      2026-08-22: already done. `rowCombination.ts:37` imports them, its `:1342` comment says both
      are adapters onto the shared core, and `affineHeight.mirror.test.ts` pins it.
- [x] ~~The `ImageBlock` alias is declared twice.~~ **Shipped in #299** — both declarations deleted; `useFullScreenImage.tsx:16` and `FullScreenModal.tsx:22` use `ViewableContent` directly.
- [x] ~~`searchImages` and `getAllImages` should share a `buildImageFilterParams` for the query string (~30 lines). The endpoints stay separate by design.~~ **Shipped in #299** — `content.ts:90-116` (27 lines, estimate good), called at `:129` csv / `:316` repeat. Endpoints stayed separate.
- [x] ~~`contentLayout.ts`'s `ProcessContentOptions.displayMode` is accepted and advertised but silently ignored — honor it or remove it.~~ **Shipped in #299 — REMOVED, not honored.** Pinned by `tests/utils/contentLayout.test.ts:1375`. Not to be confused with `processContentBlocks`' own live `displayMode` at `contentLayout.ts:412`.

### ✅ E8 · Renderer + `MenuDropdown` dedup — PR #319

**Why it is next (picked 2026-08-24).** The board named E8/F2/F5 as the candidates after E16; F5
shipped this session, so E8 and F2 remain. E8 first because it is the smaller of the two and
because F5 just re-warmed the exact reasoning its first bullet needs — the GIF-vs-image branch
split, which F5 proved is real rather than incidental (`isGifBlock` guards a `<video>` branch
against an `<Image>` branch). F2 is the larger architectural change and should follow.

**Estimate note carried from F5.** This item is quoted at **−120 src, +150–250 test**. F5's
close-out narrowed the overrun rule: the ~2.3x test blowout tracks items that ADD a caller or prop
(E13, E16), not items that DELETE one. E8 is a deletion with a new indirection, so expect its test
half nearer F5's than E16's — but **measure rather than assume in either direction**, since one
data point on each side is not a trend.

**Guardrail — leave the `pageType` union alone and report what removing it would do.** The second
bullet's claim that its "two values decide nothing" is exactly the shape of claim this board has
been wrong about before: E10 asserted `width: 600` / `height: 1100` were dead, and perturbing them
to 137/999 moved **15 hub tests** — they feed the layout solve. So `pageType` may well be inert,
but it is a claim written by a past session and not yet checked against callers. Do the config-array
dedup, leave the union in place, and report what its removal would touch. If it really is inert,
that is a two-line follow-up with evidence behind it rather than a silent deletion inside a larger diff.

**Second guardrail: extract `ReorderOverlay`, do NOT merge the GIF and image branches.** The
duplicated overlay JSX is genuinely identical and should be lifted. The branches around it are not:
they render different elements for different content types, and F5 spent this session removing a
redundant `isGif` boolean precisely because `isGifBlock` is the real discriminator. Lifting the
shared overlay is the scoped change; collapsing the branches is the tempting overreach past it.

- [x] ~~`CollectionContentRenderer` — `ReorderOverlay` JSX is duplicated verbatim in the GIF and image branches; the two placeholder blocks share construction; `isSelected` is recomputed inline twice; seven no-op `key={contentId}` on root returns.~~ Done. One correction to the bullet: `ReorderOverlay` was **already** its own component (`./ReorderOverlay`, imported since the click-to-place work) — what was duplicated is the 12-prop _invocation_, now a single `reorderOverlay` node. The three `buildWrapperClassName` calls that collapsed into `boxBaseClassName` are **three**, not two: the GIF branch passed the same option object as both placeholder blocks. All seven no-op keys removed.
- [x] ~~`MenuDropdown` — eight copies of the menu-item block → one config array (~60 lines).~~ Done, but the count was **nine**, not eight (Home, Me, Explore, Collections, Create, Update, Metadata, Comments, Admin), and the saving was **28 net lines**, not ~60 — the array entries cost real lines back. The three `<button>` rows (Log in, Log out, Clear Cache) were deliberately left alone: only two of the three share a shape, and Clear Cache carries `aria-disabled` plus a pending label. Possible follow-up, not folded in here.
- [ ] **Follow-up, evidence attached: the `pageType` union is inert and can go.** Left in place per instruction; see the measurement below.

**`pageType` guardrail — measured, and the board's claim was half right.** The union is declared in
THREE places (`MenuDropdown.tsx:28`, `SiteHeader.tsx:12`, `PageShell.tsx:11`); `SiteHeader` and
`PageShell` are pure pass-throughs with no styling hook, and the only read anywhere is
`isAdmin && pageType === 'collection'` gating the Update item. So the values break down as:

- `'manage'` — **zero call sites repo-wide.** Narrowing the union to drop it: 0 tsc errors. Free.
- `'collectionsCollection'` — behaviorally inert but **not free**: 6 src call sites + 1 test
  assertion (`PageShell.test.tsx:29`). Narrowing produced exactly 7 tsc errors.
- `'default'` — explicit at 3 call sites, and the defaulted value.

So "two values that decide nothing" is right about the _behavior_ and wrong about the _cost_: one is
a 3-line deletion, the other is a 10-file sweep. **Unlike E10, the inertness claim survived the
E10 test**: flipping all six `'collectionsCollection'` callers to `'default'` left **4374/4374 tests
and 244/244 suites passing — zero movement**, where perturbing E10's `width: 600`/`height: 1100`
moved 15 hub tests. The union is a four-value enum doing one boolean's work, and collapsing it to
`isCollectionPage?: boolean` is a clean follow-up with this evidence behind it.

**Sizing: −49 src / +90 test, against −120 src and +150–250 test. The src estimate MISSED for the
first time in four items** — F5 had just recorded "the src estimate held, the third in a row." It
came in at 41% of estimate for two reasons, both bullet-authoring errors rather than estimating
errors: the bullet budgeted for extracting `ReorderOverlay` into a file that already existed, and
the `MenuDropdown` config array was quoted at ~60 lines saved when an array entry per item costs
most of that back (28 net).

**The test half contradicts F5's corrected rule, and the reason matters more than the number.** F5
predicted E8 would land near F5 (+20) because both are deletions, not caller-additions. It landed at
+90 — ratio 1.84 test-lines per src-line deleted, between F5's 0.8 and E16's overrun. But the +90
has nothing to do with E8 being a deletion: **the reorder overlay's render gates had never been
pinned by any test.** The whole file had exactly one reorder test and it covered click suppression.
Lifting a shared node out of two branches whose gates differ, with no coverage of either gate, is
precisely where a silent regression hides — so the tests are the refactor's cost, not padding.

**Third revision of the estimating rule.** The test half does not track add-a-caller vs
delete-a-caller. It tracks **whether the touched behavior was already pinned.** E13/E16 ran over
because new callers are unpinned by definition; F5 ran under because parameter-removal touched code
its tests already covered; E8 ran mid because it touched one well-covered surface (`MenuDropdown` —
52 existing tests, zero churn needed) and one uncovered one (the overlay gates — all +90 landed
there). **Before sizing the test half of any remaining item, grep for existing coverage of the exact
behavior being moved.** F2's `RendererContext` is the live case: it moves prop threading through the
same `BoxRenderer` tree, and `boxRendererUtils.test.ts` already pins the reorder-flag half of it —
so size F2's test half by which of its touched surfaces are bare, not by its src sign.

**Red-check confirmed, per F5's warning.** Both new gate assertions were verified to fail against a
broken implementation: deleting `contentId !== currentCoverImageId` fails exactly the cover test
(1 failed / 70 passed), and neutralizing the shared node fails exactly the four presence tests
(4 failed / 67 passed). No assertion in the block passes vacuously.

### ✅ E10 · Admin panel dedup — PR #304 — CLOSED 2026-08-28 by user decision, zero further code

All four panels are on main as of 79fbca5, so every bullet below is now startable — the former
branch-only refs (CollectionsPanel) are main refs. Verified byte-identical by `diff` (re-hashed
2026-08-22), not by eye. COLD.

- [x] ~~`.loadError` is byte-identical in `CollectionsPanel`, `RolesPanel` and `UserManagementPanel`;
      `.error` is byte-identical in `CollectionsPanel` and `RolesPanel`. The 6-line retry block
      (`<div role="alert">` + `<p>` + Retry `<Button>`) is identical in **five** .tsx files, not four —
      `RoleDetailView.tsx` is the fifth copy, missed by the original audit and found by PR #304.
      Extract `<LoadError message onRetry />` into `app/components/ui/StatusText/`. It completes a
      family that already cross-references itself — `EmptyState.tsx:15-21` (**was `:15-22`**)
      explicitly says failed
      reads get their own branch, and the failed-read branch is the only member never written.~~
      **SHIPPED in #304 (`ebf1620`)** at the exact path named: `LoadError` at
      `app/components/ui/StatusText/LoadError.tsx:35`, and the "five, not four" count was right —
      all five call sites converted (`CollectionsPanel.tsx:86`, `MessagesPanel.tsx:95`,
      `RolesPanel.tsx:206`, `RoleDetailView.tsx:179`, `UserManagementPanel.tsx:129`). `.loadError`
      is gone from every panel module. The one surviving `.error` (`MessagesPanel.module.scss:7`)
      now holds the DELETE failure only, and its comment says so.
- [x] ~~`.viewAll` in `CollectionsPanel.module.scss:14-23` is byte-identical to
      `MessagesPanel.module.scss:4-13`, hover block included. The JSX is the same five lines too.~~
      **SHIPPED in #304** — hoisted to `ListPanel`: `ViewAllLink` at `ListPanel.tsx:197`, styles at
      `ListPanel.module.scss:287-301`. **BOTH original refs are now GONE, not drifted** — `.viewAll`
      no longer exists in either panel module; those line ranges hold unrelated rules today. Use the
      `ListPanel` ref instead.
- [x] **NOT A TASK — this is a recorded REJECTION and its open checkbox is what made the item look unfinished.** Do NOT extract a `<PanelBody>` owning the whole load/error/empty ladder. Checked: it needs
      ~10 props, three of them pure escape hatches — `footer` for the Messages/Roles delete errors,
      and `visible` for the Roles/Users `view.mode === 'list'` gate. `LoadingText` must stay mounted
      OUTSIDE that gate ([LoadingText.tsx:23-28](app/components/ui/StatusText/LoadingText.tsx:23), **was `:24-28`; `#304` never touched this file, the head was simply off by one**),
      so the component would have to render one child unconditionally and the rest conditionally —
      an invariant its name does not imply and nothing would enforce.
- [x] ~~The four `ContentPanelModel` literals in `buildAdminHubContent` are four copies of the same
      14-line object differing in `panelType`, `title`, and `id`/`orderIndex` that are just
      `1001+n`/`100+n`. A `PANEL_ORDER.map(...)` replaces ~60 lines with ~20.
      **`width: 600` and `height: 1100` are NOT dead** — perturbing them to 137/999 moved 15 hub
      tests. They feed the layout solve. Do not "clean them up".~~ **SHIPPED in #304** —
      `PANEL_ORDER` at `adminHubContent.ts:250`, mapped at `:322`. **The warning was heeded**: the
      dimensions survive as named constants `PANEL_DECLARED_WIDTH` (`:279`) and
      `PANEL_DECLARED_HEIGHT` (`:280`), with the 15-hub-test figure recorded in the docblock at
      `:271-278`.
- [x] ~~`newestFirst` in `CollectionsPanel.tsx:79` (**was `:58`**) is the same algorithm as `sortGroup`'s BLOG branch
      at [CollectionListSelector.tsx:67](app/components/CollectionListSelector/CollectionListSelector.tsx:67) (**was `:63`**),
      over the same `CollectionListModel` from the same `getMetadata()`. Only difference is
      `compareNames` vs a raw `localeCompare` (a real base-sensitivity difference in name
      tie-breaks, not just style — pick one deliberately).~~ **SHIPPED in #304** —
      `compareCollectionsNewestFirst` at `sortCollections.ts:22`, used at `CollectionsPanel.tsx:79`
      and `CollectionListSelector.tsx:67`. **The deliberate pick was made and recorded**:
      `compareNames` won and was applied to BOTH `sortGroup` branches (`CollectionListSelector.tsx:68`),
      rationale at `:57-61`, pinned by 20 assertions in `tests/utils/sortCollections.test.ts`
      including the base-sensitivity cases at `:56` and `:66`.
- [x] ~~Added by the 2026-08-22 review of #253: the `TALLER_THAN_OPEN_TODAY` skip lists
      (`page.collapseStates.test.ts:395`, `page.collapsedLayout.test.ts:331`) are one-directional on
      their own — each excepted state is held bidirectional only by a companion exact pin, and
      nothing asserts the two name the same states. Convert to the whole-list compare pattern the
      width sweep uses, or add that assertion.~~ **SHIPPED in #304 — so the row's "bullets 6-7
      unswept" was half wrong.** Both files now do the whole-list compare:
      `page.collapseStates.test.ts:410` and `page.collapsedLayout.test.ts:341`, both
      `expect(taller).toEqual(TALLER_THAN_OPEN_TODAY)`. The `it.each`-with-skip and the `continue`
      are gone. **Both original refs drifted AND changed meaning** — the list declarations are now
      `page.collapseStates.test.ts:368` and `page.collapsedLayout.test.ts:115`; the old line numbers
      now point at prose, one of which _describes the retired skip list_, which is exactly the kind
      of ref that reads as correct while meaning something else.
- [x] From D7, which shipped without it: `RolesPanel.module.scss:66` (**was `:72`** — #304 hoisted
      `.loadError`/`.error` out of this file and shortened it by 12 lines) still uses
      `--color-danger` for a button hover ~~where the other three panels use
      `--color-danger-text`~~. **THE COMPARISON IS FALSE, re-checked 2026-08-28. There are no other
      three panels.** `grep -rn "\.deleteButton" app | grep '\.scss'` returns **exactly one hit**,
      `RolesPanel.module.scss:42` — no other panel module defines a delete button at all. And
      `grep -rn -- "--color-danger)" app | grep -v danger-text` returns 11 hits of which
      `RolesPanel.module.scss:66` is the **only** one used as a text colour on a hover; every other
      is a `border` or `background`, which are different tokens by design. The near-misses that made
      the original claim look plausible are `.error` PARAGRAPHS (`MessagesPanel.module.scss:10`,
      `RolesPanel.module.scss:10`), not hovers.
      **So this is a one-off design call on a single line, not a consistency sweep.**
      **DECIDED 2026-08-28 by the user: KEEP `--color-danger`. Zero code change.** The bullet was
      only ever open because of the false consistency claim; once that collapsed there was no
      majority to align with and no reason to move the token. `RolesPanel.module.scss:66` stands as
      written. **Do not re-file this** — a future audit that greps `--color-danger` used as a text
      colour will find this line again and it will again look like the odd one out. It is the only
      delete button in the codebase, so "odd one out" is a set of one.

### ✅ E12 · Wire up `collections-location-${slug}` — PR #301 (image-path trigger split out as E13)

_Moved off C4 when Group C was archived. It was scoped, sized and ready, and had no board row —
the exact drift the board-maintenance note describes. C4 left it untouched deliberately and said
"do it after E11"; E11 shipped as #280, so it is unblocked._

- [ ] `collections-location-${slug}` is registered at `collections.ts:151` and revalidated
      nowhere. It is the one orphan registration left after C4 removed the four dead tags.

**Report — what wiring up `collections-location-${slug}` would actually take.**

The guardrail written when C4 was set up said the collection's locations and its previous locations
are "neither plumbed through today". That is not right, and the real obstacle is elsewhere. Both
halves of the data are already in `useCollectionEdit`: `collection.locations` gives the pre-edit set
(there is already an `originalLocations` memo built from it), and the save path already reads
`response.collection.locations` into a `resolvedLocations` local. `CollectionModel.locations` is a
`LocationModel[]` and `LocationModel` carries `slug`. What actually blocks it:

1. **The helper's signature, and its call sites.** `revalidateCollectionCache(slug)` takes one
   collection slug and is called from eight places, including `CreateCollectionForm` and
   `useCaptureDateSelection`, which have no location data in scope. Either the helper grows a second
   argument most callers cannot fill, or location revalidation moves out of it and into the save
   paths in `useCollectionEdit` that do know about locations. The second is the honest shape, and it
   means location freshness depends on which code path did the edit — which needs saying out loud.
2. **New locations have no slug until the backend assigns one.** A location added during an edit is
   `{ id: 0, name, slug: '' }` on the frontend. Revalidating from `updateData` would build
   `collections-location-` and hit nothing. It has to come from the post-save
   `response.collection.locations`, so it can only run after the save resolves, not optimistically
   alongside the other three.
3. **Removals need the union, not the new set.** Moving a collection from Seattle to Portland has to
   revalidate both location pages. Revalidating only the post-save locations leaves the Seattle page
   listing a collection that is no longer there for up to `TIMING.revalidateCache`. So the call needs
   previous ∪ next, which is why the pre-edit set matters and why this is not a one-liner.
4. **Unverified: whether the backend keys that endpoint off collection locations alone.**
   `/collections/location/{slug}` is a backend query. Whether an IMAGE-level location change can move
   a collection in or out of that list is not knowable from this repo, and it decides whether image
   edits need to trigger this too. Worth one question to the backend before building.

Sizing: small if it lands as a `revalidateLocationCaches(previous, next)` helper called from the
`useCollectionEdit` save paths — roughly +30 source, +60 test. Do it after E11, not before: E11
decides how a template-keyed tag gets registered and revalidated through one place, and this is the
second template-keyed tag that would use it.

---

### ✅ E13 · Trigger `collections-location-${slug}` from the image-metadata save path — PR #313

**SHIPPED 2026-08-24 — PR #313, +36 src net / +165 test, 7 new tests.**

**The src estimate held; the test estimate was 2.75× under.** Estimated +30 src / +60 test, actual
+36 / +165. The src half held for the reason the item itself gave — "a second caller, not new
logic" — and that framing is checkable before building, which is why it worked. Of the +45 src
lines added, **six are executable**: the import, the `previousLocations` binding, and the four-line
`void revalidateLocationCaches(...)` call. Everything else is docblock. The test half missed for the
usual reason (bias 1b): a second call site still needs its own suite, and pinning the union, the
slug source and the bulk case takes more setup than the one-line call suggests.

**Where it landed:** `submitImageEdits` in `app/components/Metadata/hooks/useMetadataSubmit.ts`.
`previous` reads off `imageSubset` (still the pre-save images at that point), `next` off
`response.updatedImages`. Both guardrails held — `revalidateLocationCaches` was not touched except
for its docblock, and `buildAssociationDiff` was not touched at all.

**Four of the seven new tests fail without the change; three pass either way.** Verified by removing
the call and re-running, rather than assuming. The three that pass either way are the negative
cases (no locations, null response, revalidation rejects) — they are guards, not proof, and are
labelled as such here so a future reader does not mistake the count for coverage.

**E13 grew the exact docblock that G4 was filed about, and the next session caught it.** G4's origin
story is "#301's 30-line `revalidateLocationCaches` docblock". Rewriting that docblock for E13's
second caller took it to **37 lines** — and one of the added paragraphs described the location-rename
gap, which is G4's precisely named anti-pattern: a tracked item (E16) copied into a docblock, going
false the day that item ships. Trimmed to **24 lines** on 2026-08-24, below the 30 it started at, by
cutting the rename paragraph entirely and folding the two-call-sites explanation into one. E16 owns
that content.

**The generalizable part: an item that adds a caller to a documented helper will grow that helper's
docblock, and nobody budgets for it.** E13's own docblock accounting says 39 of its 45 added src
lines were comment. Any remaining item that wires a second caller into an already-documented helper
(E16 most immediately) should expect the same and should re-measure the docblock rather than assume
the addition was small.

_Split out of E12 (PR #301) once the backend question E12 could not answer got answered._

E12 wired the tag from the collection-edit save paths, which is correct regardless of what the
backend does. This item is the other half.

**The backend does NOT key `/collections/location/{slug}` off collection locations alone.**
`CollectionService.getLocationPage` runs two queries: the collections at that location, plus orphan
images from `ContentRepository.findOrphanImagesByLocationName`, matched by image location name. So
retagging a single image changes what a location page shows, and an image-level location edit has to
revalidate the tag too.

- [x] Call `revalidateLocationCaches(previous, next)` from the image-metadata save path. The helper
      already exists in `collectionEditUtils.ts` and already handles the union, the dedup and the
      slug-less case — this is a second caller, not new logic. **Done in #313, exactly as written —
      the helper's body is byte-identical.**
- [x] ~~Confirm with the backend that `findOrphanImagesByLocationName` is the only image-side
      input.~~ **ANSWERED 2026-08-24 by reading backend `origin/main`, no backend session needed.**
      `CollectionService.getLocationPage` (`services/CollectionService.java:232`) makes exactly six
      repository reads. Three are collection-side (`countListedByLocationName`,
      `findListedByLocationName`, `findListedIdsByLocationName`) and are E12's territory. One is the
      location record itself (`locationRepository.findByLocationName`). The image side is a
      find/count PAIR — `contentRepository.findOrphanImagesByLocationName` and
      `countOrphanImagesByLocationName` — but both take the same `(locationName, allCollectionIds)`
      key, so there is **one image-side matching rule**, not two. The premise holds and the item is
      COLD.

**One thing the answer added.** The orphan queries take `allCollectionIds` and exclude images
already inside a listed collection at that location. So an image appears on `/location/{slug}` only
while it is an orphan there, and a COLLECTION-side change can move an image on or off the page
without the image being touched. E12 already revalidates on the collection side, so the pair is
complete once this lands — but do not describe this item as "the image half" in code; it is the
image-side TRIGGER for a page whose contents both sides feed.

- [x] ~~**Check before building: what happens on a location RENAME?**~~ **CHECKED 2026-08-24, both
      sides. The rename is real, and the consequence is worse than this bullet guessed.** The
      frontend exposes it at `/metadata`: `MetadataList.handleUpdate`
      (`app/components/ui/MetadataList/MetadataList.tsx:74`) PUTs `{ name }` to
      `/metadata/locations/{id}`, and that surface does not revalidate anything at all. The backend
      then **recomputes the slug unconditionally** — `MetadataService.java:410` does
      `location.setSlug(SlugUtil.generateSlug(locationName))` with no guard, and the DAO's UPDATE
      writes the column. So the old slug does not go stale, it **stops existing**:
      `CollectionService.getLocationPageBySlug` resolves via `locationRepository.findBySlug(...)
.orElseThrow(...)`, and there is no slug-history or redirect table anywhere in the backend.
      `/location/{old-slug}` 404s while its cache tag keeps serving a snapshot of a page whose URL
      is gone. **Filed as E16 rather than folded in here** — the caller is a generic list component
      shared with tags and people, so it needs a callback prop, not a hardcoded call. That is a
      different change from this item, and this item's premise ("a third caller, not a change to
      the helper") survives.

Sizing: +30 src, +60 test, assuming the helper needs no changes. **Actual +36 src / +165 test.**

**Two adjacent paths deliberately NOT wired, both verified rather than assumed:**

1. **The GIF save path (`submitGifEdit`) needs nothing.** `ContentGifModel` does carry `locations`,
   so this looked like a symmetric gap. It is not: `findOrphanImagesByLocationName` and its count
   twin build on `SELECT_CONTENT_IMAGE` and `JOIN content_image ci ON c.id = ci.id`
   (`ContentRepository.java:390-450`), which structurally drops every non-image row — there is no
   `content_type` predicate doing it. GIFs live in `content_gif`. So a location-tagged GIF can
   never appear on `/location/{slug}`, and revalidating on GIF save would be a no-op.
   **Backend footnote worth its own eyes later:** `content_image_locations` is content-level keyed
   (`cil.content_id`, generalized by V27), so GIFs _can_ be location-tagged and simply never
   surface. That reads like an unintentional gap on the backend, not a deliberate exclusion. Not
   filed here because it is a backend item, not a frontend one.

2. **`handleRemoveFromCollection` is a real gap and is NOT covered.** It sits in the same hook and
   also calls `updateImages`, but it changes collection membership, not locations. That still moves
   a location page: the orphan queries take `allCollectionIds` and exclude images already inside a
   listed collection at that location, so dropping an image out of a collection can flip it INTO
   orphan status and onto `/location/{slug}`. Left alone because this item is scoped to the
   location-editing save path, and the fix is three lines in a different function. **Confirm the
   scope call before filing it** — it may belong to E16's MR rather than its own row.

**Guardrail — `buildAssociationDiff` is one file away and is NOT a duplicate.** This item puts you
in `Metadata/metadataUtils.ts`, where `buildAssociationDiff` (`:305`) sits beside the now-shared
`buildEntityDiff` that E4 extracted. It reads like the same function and is not one. Held in #313:
it was not touched. See the table in E4, and the warning pinned in `entityUtils.ts`'s own docblock.

**Report as asked: unifying them would change nothing a user can trigger — but keep them separate
anyway, for a different reason than this board gave.** Investigated 2026-08-24 without editing.

- **The mechanism the board describes is real.** `buildAssociationDiff` emits whenever the edited
  set holds any unsaved name (`metadataUtils.ts:315,319,321`); `buildEntityDiff` compares unsaved
  names on both sides and returns `undefined` when they match (`entityUtils.ts:82,88-92`).
- **The consequence it draws does not follow, and the sentence is now corrected in E4.** Every
  divergent case needs `current` to hold an `id === 0` entry, and no `buildAssociationDiff` call
  site can produce one: both callers (`metadataUtils.ts:459-460`, `:490`) take backend-sourced
  models, and post-save state is re-read from `response.updatedImages`. The only code writing
  `{id: 0}` into a current-side list (`useCollectionEdit.tsx:1211`, `:1249` — **were `:1194`/`:1232`**, +17 by #339) already feeds
  `buildEntityDiff`. **And "which saves fire" is wrong even where the outputs differ**: the image
  path calls `updateImages` unconditionally (`useMetadataSubmit.ts:138`), gated only by
  `hasChanges`. A diff controls payload CONTENTS, not whether a save happens. The one path where an
  empty diff does suppress the request is the GIF path (`useMetadataSubmit.ts:104`), and it routes
  only `people`/`locations` against a server model.
- **"Its ids are optional" describes an unreachable branch.** The signature says `id?: number`
  (`metadataUtils.ts:305`), but every concrete model — `ContentTagModel`, `ContentPersonModel`,
  `LocationModel` — declares `id: number` required. Struck from E4's table.
- **Two divergences neither the board nor the docblock names.** (1) The reverse case: current holds
  an unsaved name and the update drops it — `buildAssociationDiff` emits nothing,
  `buildEntityDiff` emits `{prev}`. (2) `prev` is built from a raw array in one
  (`metadataUtils.ts:324`) and a `Set` in the other (`entityUtils.ts:95`), so duplicates survive
  only in the former. **(2) is the sole divergence with a reachable trigger**: bulk edit merges
  `updateState.tags` with `imageSpecificTags` (`metadataUtils.ts:635-640`), which can repeat an id
  and ship `prev: [5, 5]`. `buildEntityDiff` would ship `prev: [5]` — a fix, not a regression,
  though the backend's tolerance for the duplicate was not verified.
- **Unifying would pass the suite silently.** All six cases in the `describe.each` block at
  `tests/components/Metadata/metadataUtils.test.ts:298-396` use real ids or empty arrays on the
  current side, and produce byte-identical output from either function. Nothing pins the divergent
  behavior of `buildAssociationDiff`. The untested case is untested because it is unreachable — but
  that is an argument from call-site analysis, not from the green suite.
- **Where the both-sides check genuinely earns its keep is the COLLECTION path, not the image one.**
  There `originalTags` comes from `convertTagsToModels(collection.tags, ...)` over bare names, so
  unresolved entries really are `{id: 0}` via `createUnknown` (`entityUtils.ts:56`), and
  `isUpdateDirty` (`useCollectionEdit.tsx:658-663`) diffs the built payload to decide whether Save
  lights up. Drop the check there and the button is dirty on load. That is the real reason the two
  behaviors both exist.
- **Recommendation: leave them separate.** Not because unifying breaks a save — it does not — but
  because the merge is mechanical churn (`buildAssociationDiff` mutates `diff[field]` in place and
  takes a `field` discriminator; both call sites would need rewriting to a return-a-value shape) in
  exchange for one payload dedup that no one has reported. If it is ever revisited, the dedup is
  the reason to do it, and this paragraph is the sizing.

**Second guardrail: do not grow `revalidateLocationCaches`.** Its docblock says `handleUpdate` is
the only caller — that sentence becomes wrong when this lands, and the correct fix is to update the
sentence, not to generalize the helper. It already handles the union, the dedup and the slug-less
case. This is a second call site. **Held in #313: the helper's body is unchanged and only the
docblock moved.**

### ✅ E14 · `createHeaderRow`'s `_chunkSize` is dead but receives a live value — PR #307

**SHIPPED 2026-08-24 — PR #307, −3 src / −4 test net, 36 call sites touched.**

**This is the first estimate on this board to land on the nose.** Estimated "−2 src, ~40 test call
sites"; actual −3 src (the parameter, its `@param` line, and the forwarding argument) and 36 sites.
It held for the reason "How to use this doc" already predicts: the sizing was done by grepping the
symbol's call sites first, so the test churn was counted rather than discovered. Every estimate on
this board that was built that way has held; every one built from source alone has missed.

**Type-checking is what made a 36-site positional shift safe.** With the parameter gone, any call
still passing a number in slot 3 fails to compile against `isMobile: boolean`. That is why this was
mechanical rather than risky, and it is the reusable part: a positional-parameter removal in
TypeScript is self-verifying, whereas the same removal in a JS or untyped-options codebase is not.
Full suite came back 233 suites / 4243 tests, identical counts to `main`.

**The options-object alternative below was NOT taken, and not deliberately.** #307 did the straight
deletion. The session that shipped it was working from `main`, where this item did not yet exist —
E14 was defined on the unmerged #305 branch — so the alternative was never weighed. That is a
process finding worth more than the item: **a board item can be invisible to the session doing its
work if the item is still sitting in an open board PR.** The two trailing booleans survive, so the
idea is still live and is now filed as **E15**, where it is a smaller change than it would have been
here.

_Found while finishing E5 (PR #299) and deliberately left out of it — it is not one of E5's six
duplication bullets, and folding it in would have invalidated that MR's verification._

- [x] `_chunkSize` occurs exactly twice in `app/utils/contentLayout.ts`: the docblock and the
      parameter declaration. The body never reads it. The docblock says "(unused, kept for API
      compatibility)". But `processContentForDisplay` in the same file **does** pass a real
      `chunkSize` into that slot, so the value is computed, threaded through and discarded.
      **Confirmed exactly as written and removed in #307.** The "kept for API compatibility" note
      was false: there is no external API. `createHeaderRow` has one production caller —
      `processContentForDisplay`, in the same file — and no other file in `app/` calls it.
      `processContentForDisplay`'s **own** `chunkSize` is real (it drives `rowWidth` via
      `DENSITY_ROW_WIDTH_MULTIPLIER`) and was left untouched; do not confuse the two on a future read.

**This is larger than a two-line deletion, which is why it is its own item.** Roughly 40 call sites in
`tests/utils/contentLayout.test.ts` pass a third positional argument, and the parameters after it —
`isMobile` and `forceRail` — are both positional, so removing a middle parameter shifts them. Every
call site needs checking individually, including the four- and five-argument forms and the bare
three-argument ones.

Worth considering instead of a straight deletion: convert the tail parameters to an options object.
That removes the positional-shift hazard permanently rather than paying it once now and again at the
next signature change. **Not done in #307 — carried forward as E15.**

---

### ✅ E15 · `createHeaderRow`'s two trailing boolean params → options object — PR #314

**SHIPPED 2026-08-24 — PR #314, +22 src net / 14 test call sites rewritten.**

**The first call-site estimate on this board to come in OVER rather than under.** Estimated ~20
sites, actual 14 — 36 total callers, of which 22 pass two arguments and were untouched exactly as
predicted. The estimate was made the right way (grep first), and it still missed by 30%, because it
counted "calls with a third or fourth argument" from a naive text scan. A `createHeaderRow(` scan
that does not balance parentheses miscounts every nested call like `createHeaderRow(bare(), 1200,
false)`. **Balance the parens, or the grep-first rule buys less than it looks like it does.**

**E14's self-verification property carried over intact, which is the reusable part.** Changing slot
3 from `boolean` to an object means every unconverted call fails to compile — `TS2559` for the
three-argument form, `TS2554: Expected 2-3 arguments, but got 4` for the four-argument one. The
compiler enumerated all 14 sites; no site was found by reading. Same as E14, and the same caveat
applies: this is a TypeScript property, not a general one.

**The "roughly net-neutral, may be net positive" line-count prediction was wrong.** Actual +22 src
net. The conversion itself is nearly free — the signature loses a line, the destructure adds one,
the production call site loses two — but `HeaderRowOptions` needs declaring and its two keys need
docblocks, and `forceRail` in particular is not self-explanatory. That is the cost of the
readability win, not a surprise, and the item was right that the win is the point.

**Behaviour is provably unchanged**: 108 `contentLayout` tests pass unmodified except for their call
shape, and the full suite is 243 suites / 4356 tests — identical counts to before, as a pure
refactor should be. **Browser verification was not possible**: the local Spring Boot backend was not
running, so every page fails at `meServer`'s `/auth/me` fetch with `ECONNREFUSED` before any header
renders. Unrelated to this change, but recorded so the next reader does not take "verified by tests
and types only" for an oversight.

_Split out of E14, 2026-08-24. E14 raised this as the alternative to a straight `_chunkSize`
deletion; #307 shipped the deletion without weighing it, because E14's section was still sitting in
the unmerged #305 board PR and was invisible from `main`._

**#314 was stacked on #313, deliberately, for exactly that reason.** E15 and E13 both edit this
board, so branching E15 off `main` would have conflicted here AND re-created the trap E14 named — a
session working from `main` cannot see an item that lives in an open board PR.

**The stacking then cost more than the conflict would have. #314 merged and E15 still did not reach
`main`.** #313 merged to `main` at 21:17:42; #314 merged into `0313-e13-image-location-revalidate`
at 21:18:15 — a branch `main` had already absorbed and that nobody would merge again. GitHub
auto-retargets a stacked PR when its base merges, but not inside a 33-second window. `gh pr view
314` reported `MERGED`, this board read ✅, and `createHeaderRow` on `main` still had both boolean
params. Caught the next session by `git merge-base --is-ancestor 1d48581 origin/main` returning
false, and re-landed as **#315**, which merges onto `main` with no conflicts.

**The lesson is not "don't stack" — the reasoning for stacking was sound and the doc conflict was
real.** It is that a stack has a merge PROTOCOL, and skipping it is silent. Merge base-first,
confirm the child re-targeted to `main`, and verify with `merge-base --is-ancestor` rather than the
badge. Hoisted into "how to use this doc", because every future two-item session on this board has
the same board-conflict pressure that produced the stack.

After #307 the signature is `createHeaderRow(collection, componentWidth, isMobile = false,
forceRail = false)` — two trailing positional booleans. This is the boolean-trap shape: the call
sites now read `createHeaderRow(bare(), 375, true, true)`, where nothing at the call site says which
`true` is which.

- [x] Convert the tail to a single options object — `createHeaderRow(collection, width, opts)` with
      `opts` carrying `isMobile` and `forceRail`. Both already default to `false`, so `opts` and
      both its keys stay optional and the two-argument calls do not change at all. **Done as
      written; the defaults moved into a destructure and all 22 two-argument callers are untouched.**
- [x] ~~Roughly 20 call sites~~ **14 call sites** in `tests/utils/contentLayout.test.ts` pass a third
      or fourth argument and need rewriting; the ~~~16~~ **22** two-argument calls are untouched.
      **Grep the symbol before sizing** — that is what made E14's estimate the only one on this
      board to hold. **It held here too, but only roughly: both call-site numbers were off because
      the scan did not balance parentheses.**

**Two sibling functions have the same shape and were deliberately left alone.**
`createTextOnlyHeaderRow` (`contentLayout.ts:552`) and `createMetadataTextBlock` (`:505`) each take
a single trailing `forceRail: boolean = false`. They are not the boolean-trap shape this item
targets — one trailing boolean next to clearly-typed arguments is readable, and both are
module-private with a handful of callers. Converting them would be churn. Named here so the next
reader sees they were considered rather than missed.

**Smaller now than it would have been inside E14**, because `_chunkSize` is already gone: this
converts two parameters, not three, and the positional-shift hazard it removes is the one E14 just
paid once.

**Do this one for the readability, not the line count — it is roughly net-neutral and may be net
positive.** If that is not worth an MR right now, say so on the row and close it rather than leaving
it to be re-derived a third time. **Done, and the readability framing was correct: the line count
went the other way (+22) and the call sites still read better —
`createHeaderRow(bare(), 1200, { isMobile: false, forceRail: true })` against the old
`createHeaderRow(bare(), 1200, false, true)`.**

---

### ✅ E16 · Revalidate the OLD slug when a location is RENAMED — PR #316 + #317

_Split out of E13, 2026-08-24. E13's "check before building" bullet asked whether the frontend even
exposes a location rename. It does, and the answer was worth its own item._

**This is not a stale-cache bug. The old URL 404s.** Both halves verified by reading source, no
guessing:

- **Frontend.** `/metadata` renders `MetadataList` per entity type. `handleUpdate`
  (`app/components/ui/MetadataList/MetadataList.tsx:74`) PUTs `{ name: newName }` to
  `/metadata/locations/{id}` via `fetchAdminPutJsonApi`, splices the response into local state, and
  **revalidates nothing** — grep for `revalidate` in that file returns zero hits.
- **Backend.** `MetadataService.java:410` runs `location.setSlug(SlugUtil.generateSlug(locationName))`
  unconditionally on update, and the DAO's `UPDATE location SET location_name = :locationName,
slug = :slug` writes it. There is no `@PreUpdate` to worry about — `LocationEntity` is a plain
  POJO with hand-written JDBC, so that one line is the whole story.
- **Consequence.** `CollectionService.getLocationPageBySlug` resolves through
  `locationRepository.findBySlug(slug).orElseThrow(...)`. No slug-history table, no redirects. After
  a rename the old slug throws, while `collections-location-${oldSlug}` keeps serving a cached
  snapshot of a page whose URL no longer resolves.

- [x] ~~Revalidate the old slug's tag on rename.~~ **SHIPPED 2026-08-24 as slice 2 (#317).** The
      old slug is only in scope BEFORE the PUT resolves, as `item.slug`; `handleUpdate` overwrites
      `items` with the response and discards it.
      `revalidateLocationCaches([item], [response])` fits the existing signature as-is — this is a
      **third call site, not a change to the helper**, same as E13 was a second.
- [x] ~~**The obstacle that makes this bigger than E13: `MetadataList` is generic.**~~ **BUILT AS
      DESCRIBED, slice 2 (#317)** — a per-list `onRenamed` callback plus an `onDeleted` twin, wired
      by `MetadataPageClient` for locations only. It type-checked with no cast on the first try,
      which is the report below coming true rather than luck. Original reasoning, unchanged: it
      renders tags, people and locations from one component and does not know which it is holding,
      so a hardcoded call is wrong. Add a per-list callback prop and let `MetadataPageClient` pass
      the location-specific one. Do NOT special-case entity type inside `MetadataList`.
- [x] ~~**Tags need the same treatment; people do not.**~~ **SETTLED 2026-08-24 — the tag half is a
      no-op and is now OUT of scope.** The backend halves are as described: `MetadataService.java:95`
      re-slugs tags exactly like locations, while `updatePerson` (`:160-161`) sets only the name and
      `Records.java:44` has no slug field at all. But the frontend decides it: grepping every
      `next: { tags: [...] }` registration in `app/lib/api/` returns exactly six tags —
      `collections-index`, `content-locations`, `content-tags`, `search-images`,
      `collection-${slug}` and `collections-location-${slug}`. **`collections-location-${slug}` is
      the only slug-keyed one.** Nothing registers a `collections-tag-${slug}`, so a tag rename
      cannot strand a cache tag. Build the location half only.
- [x] ~~**New, found while settling the above: the rename path revalidates NOTHING, not even the
      flat tags.**~~ **SHIPPED 2026-08-24 as slice 1 (#316).** `MetadataList.handleUpdate` posts
      no `/api/revalidate` at all, so renaming any of the three entity types leaves
      `content-tags` / `content-locations` stale as well — a plain
      staleness bug that is separate from the old-slug 404 and applies to people too. The fix is one
      unconditional `revalidateMetadataCache()` on the rename path, which already exists in
      `collectionEditUtils.ts` and covers `content-tags`, `content-locations` and `search-images`.
      Do this first: it is smaller than the slug half, needs no callback prop, and helps all three
      entity types. `handleDelete` needs the same call.
      **Actual +9 src / +72 test against an estimate of ~+5 src.** One import and two
      `void revalidateMetadataCache()` lines — but 6 of the 9 src lines are the component
      docblock explaining why a deliberately generic list calls a metadata-cache helper. That is
      E13's lesson landing a second time (39 of 45 there): **an item that adds a caller pays for
      the comment that justifies the call, and no estimate on this board budgets for it.** Budget
      it in slice 2. No branch was needed — the call is correct unconditionally, so the generic
      shape was never under pressure in this slice.
- [x] ~~`MetadataList.handleDelete` (`:97`, was `:74` before E16 grew the file) has the same
      exposure and is a cheaper case:~~ on delete
      the slug is unambiguously gone. Decide it with this item rather than filing a third row.
      **DONE across both slices.** Slice 1 gave it the unconditional `revalidateMetadataCache()`;
      slice 2 gave it `onDeleted`, wired to `revalidateLocationCaches([item], [])`. It was the
      cheaper case as predicted — no response to diff against, so it takes only the removed item.

**Guardrail — leave `MetadataList`'s generic shape alone.** This item puts you in
`app/components/ui/MetadataList/MetadataList.tsx`, which renders tags, people AND locations from one
component and deliberately knows nothing about which it holds. The tempting change is an
`entityType` prop plus a branch inside `handleUpdate` — it is three lines and it looks like the
direct route. It is the wrong seam: it puts location-specific cache knowledge inside a generic list,
and the next entity type pays for it again. Pass a callback from `MetadataPageClient`, which already
knows which list it is rendering. **If you conclude the branch really is better, report what
changing it would do rather than making the edit** — the generic shape is load-bearing for tags and
people, and this board has a standing habit of obeying a guardrail whose stated reason turns out to
be wrong (see E13's `buildAssociationDiff` report), so the reasoning here deserves the same
scepticism.

**Report on the `entityType` branch, per the guardrail — obeyed, and the stated reason turns out to
be the weaker of two.** Slice 1 never tested the guardrail: its call is correct unconditionally, so
no branch was tempting. This report is about slice 2, where the branch genuinely is the tempting
three-line route.

The stated reason is a design argument — location knowledge does not belong in a generic list, and
the next entity type pays again. True, but soft, and this board has been burned by soft reasons
before. There is a harder one underneath it, and it is a type error:

- `MetadataList` is generic over `T extends MetadataListItem`, whose `slug` is
  `string | undefined`. `revalidateLocationCaches(previous: LocationModel[], next: LocationModel[])`
  wants `LocationModel`.
- **An `entityType` prop is a string, and a string cannot narrow `T`.** Inside
  `if (entityType === 'locations')`, `item` is still `T` — TypeScript has learned nothing about
  it. So the branch needs `item as unknown as LocationModel` (a double cast: `T` and
  `LocationModel` have no overlap TypeScript accepts singly), or it needs
  `revalidateLocationCaches` widened to `{ slug?: string }[]` — which that helper's own docblock
  forbids: "Give a new caller its own call rather than generalizing this helper."
- A callback prop has neither problem. `MetadataPageClient` renders `items={locations}`, so `T`
  infers as `LocationModel` at that call site. `onRenamed?: (previous: T, next: T) => void` then
  hands it two `LocationModel`s and `revalidateLocationCaches([previous], [next])` type-checks with
  no cast. **The generic binding does the narrowing the string prop cannot.**

**Confirmed by building it (slice 2, #317).** `onRenamed?: (previous: T, next: T) => void` and
`onDeleted?: (item: T) => void`, wired in `MetadataPageClient` as
`onRenamed={(previous, next) => void revalidateLocationCaches([previous], [next])}` and
`onDeleted={item => void revalidateLocationCaches([item], [])}`. `tsc --noEmit` passed with no
cast and no change to `revalidateLocationCaches`, exactly as predicted. Two more call sites for
that helper, still no edit to it — its docblock's "give a new caller its own call" rule now has
four callers behind it.

So the branch costs a double cast or a forbidden helper change, and the callback costs a prop. Take
the callback — not because the design is tidier, but because it is the only one of the two that
type-checks under this repo's no-`any` rule. Second-order cost worth naming: `entityType` would
duplicate a fact `basePath` already carries (`/metadata/locations`), giving two sources of truth
that can silently disagree. **No edit made. The guardrail holds, on a stronger reason than the one
it was written with.**

**Close-out sizing, both slices.** +40 src / +281 test against +30 src / +120 test estimated.
The src half held; the test half came in 2.3x over, the same direction and roughly the same
factor as E13 (+165 against +60). **Two items running now say the test estimates on this board
are the ones that are wrong, not the src estimates** — E13, E15 and E16 all had src land at or
near estimate. Worth re-basing the remaining test columns before F2 quotes "+150-250 test".
**Narrowed the same day by F5, which came in UNDER on tests (+20 net against +60-120):** the
overrun tracks items that ADD a caller or prop, not items that delete one. See F5's close-out.

And the docblock lesson landed a THIRD time, harder: **22 of slice 2's 31 src lines are comment**
(slice 1 was 6 of 9, E13 was 39 of 45). Two new props needed their own doc comments, and
`MetadataPageClient` needed a docblock explaining why it owns slug revalidation at all. At three
occurrences this is not an anecdote: **on this codebase, a src estimate for an item that adds a
caller or a prop should be doubled, and the doubling is all comment.**

**Second guardrail: do not add `collections-location-*` to `revalidateMetadataCache`.** Slice 1
calls that helper, and its docblock carries a standing rule — a tag goes in it only in the same
change that adds the `next: { tags: [...] }` registering it. `collections-location-${slug}` is
registered per-slug by `getCollectionsByLocation` and is already served by
`revalidateLocationCaches`. Two helpers, two jobs.

**Backend bug found in passing, NOT part of this item and not fixed here.** `updateLocation` checks
uniqueness on the NAME only (`MetadataService.java:403-407`), while `V8` put a UNIQUE index on
`location.slug`. Two distinct names that slugify identically — `"St. Moritz"` and `"St Moritz"` —
pass the name check and then hit a constraint violation on the UPDATE. The create path consults
`findBySlug` first; the admin update path does not. That is a backend 500, and it belongs on the
backend's board, not this one.

Sizing: **+25 src, +120 test** (test half re-sized 2026-08-24 off E13's actual +165 for a simpler
change — the original +60 was the same bias 1b every estimate on this board has hit). The src is a
callback prop and two wiring lines.

**Two slices, and the cheap one is not the headline one.** Slice 1 is the unconditional
`revalidateMetadataCache()` on rename and delete: no callback prop, helps tags/locations/people
alike, and is roughly +5 src. Slice 2 is the old-slug revalidation, which needs the callback prop
and is location-only. **Ship slice 1 even if slice 2 gets deferred** — it is close to free and fixes
a real staleness bug on its own. Do NOT bundle the tag half into either; it is settled as a no-op
above.

---

### ✅ E17 · Collapse the inert `pageType` union to a boolean — SHIPPED

**SHIPPED 2026-08-24 — PR #322, +3 src (−2 code, +5 comment) / +9 test.** `pageType` is gone
repo-wide. `MenuDropdown` and `SiteHeader` take `isCollectionPage?: boolean`; `PageShell` lost the
prop entirely. 244 suites / 4382 tests pass.

**The board offered two shapes and the deeper one was available.** The section proposed either
`isCollectionPage?: boolean` on all three, or dropping `pageType` from `SiteHeader`/`PageShell` and
letting `MenuDropdown` take the boolean. The second is not quite possible as written — the value
originates at the page and has to reach `MenuDropdown` through whichever of the two renders the
header — but a hybrid is: **all seven `PageShell` call sites pass a value meaning "not a collection
page"** (five `collectionsCollection`, two `default`), and the only `'collection'` call site,
`CollectionPage.tsx:122`, renders `SiteHeader` directly. So `PageShell` does not need the prop at
all. It now has one fewer prop, and a docblock saying why and when to add it back.

**The −15 src estimate was wrong in an instructive way: it assumed shorter lines are fewer lines.**
Swapping a union for a boolean is a same-line edit at all 3 declarations and all 10 call sites —
`<PageShell pageType="collectionsCollection">` becomes `<PageShell>`, which is 1 line before and 1
line after. The only line deletions available were `PageShell`'s three (prop declaration,
destructure entry, JSX attribute), and Prettier gave one back by collapsing the signature. Net
**−2 src code**, plus **+5 comment** for the two new prop docblocks and `PageShell`'s "no
`isCollectionPage` prop, and here is why" paragraph. **New counting caution for this board: an item
whose win is narrower types rather than deleted code will score ~0 on a line count, and that is not
a failed item.** E17 removed a four-value union that could express three states nothing read; the
line count cannot see that.

**The near-zero test half held, so the E8 rule does not need a fourth revision.** The section said
"every touched surface is already pinned … If it is not, the rule needs a fourth revision." It was
right: `MenuDropdown.test.tsx`'s 52 tests already covered both Update-gating cases and needed only
the prop rename; `PageShell.test.tsx` already pinned the forwarding. The +9 is one new test plus a
richer mock stub — `PageShell` can no longer be asked for a collection header, so a test now pins
that its header is never one. That is new behavior worth a test, not churn.

**Board correction found while measuring: this section's "4374/4374 tests, 244/244 suites" is
stale.** `main` at `1fe82a5` measures **4381 tests / 244 suites**. The perturbation result itself is
unaffected — "zero of them moved" is a delta, not a total — but the total should not be quoted
forward. Both numbers on this page were re-measured with a clean `jest` run on `main` with the
working tree stashed, which is the cheap check that catches this class of drift.

Filed 2026-08-24 out of E8's guardrail. E8 was told to leave the `pageType` union alone and report
what removing it would do; this is that report promoted to its own item, so the evidence does not
rot inside a shipped section.

**The union does one boolean's work.** `pageType?: 'default' | 'manage' | 'collection' |
'collectionsCollection'` is declared in THREE places — `MenuDropdown.tsx:28`, `SiteHeader.tsx:12`,
`PageShell.tsx:11`. `SiteHeader` and `PageShell` are pure pass-throughs with no styling hook. The
only read anywhere in the repo is `isAdmin && pageType === 'collection'`, gating the Update item.

**Measured 2026-08-24, method recorded** (per the new counting rule in "How to use this doc"):

- `'manage'` — **zero call sites repo-wide.** Narrowing the union to drop it: `tsc --noEmit` clean.
  Free, 3-line deletion.
- `'collectionsCollection'` — behaviorally inert but **not free**: 6 src call sites plus 1 test
  assertion. Narrowing produced exactly 7 `TS2322` errors, at `(admin)/admin/page.tsx:82`,
  `(admin)/admin/users/[id]/page.tsx:100` and `:136`, `collections/page.tsx:110` and `:125`,
  `ContentCollection/CollectionPage.tsx:150`, and `tests/components/ui/PageShell.test.tsx:29`.
- `'default'` — explicit at 3 call sites, and the defaulted value.

**Inertness was proven by perturbation, not by grep — and unlike E10, the claim held.** Flipping all
six `'collectionsCollection'` callers to `'default'` left **4374/4374 tests and 244/244 suites
passing, zero movement.** This is the same test E10 failed: perturbing its `width: 600` /
`height: 1100` to 137/999 moved 15 hub tests because they fed the layout solve. Running the
perturbation is what separates the two, and it is cheap — do it before believing any future
"decides nothing" claim on this board.

**Scope.** Replace the union with `isCollectionPage?: boolean` (or drop `pageType` from
`SiteHeader`/`PageShell` entirely and let `MenuDropdown` take the boolean), touching the 3
declarations plus the 10 call sites and 1 test assertion. **Sized at −15 src / ~0 test:** every
touched surface is already pinned — `MenuDropdown.test.tsx` has 52 tests including both Update-gating
cases, and `PageShell.test.tsx` pins the forwarding — so per E8's corrected rule this is a rare item
whose test half really should be near zero. If it is not, the rule needs a fourth revision.

**Why it was not folded into E8.** Deliberately quarantined by instruction, and correctly so: the
board's claim was that "two values decide nothing", which is the exact shape of claim E10 got wrong.
Doing it inside E8's diff would have buried a 10-file sweep in a dedup MR with no evidence trail.

## Closed-item classification rows (moved off the live board 2026-08-28)

_Their final state at close, kept for forensics. The live board's table now lists only open items._

| Item    | State     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E5**  | ✅ CLOSED | —— swept 2026-08-28: all four "open" bullets shipped in `699441b`, inside PR #299 itself. Nothing was open. FIFTH shipped-but-unticked occurrence                                                                                                                                                                                                                                                                                                                                              |
| **E10** | ✅ CLOSED | —— the user was asked and answered 2026-08-28: **keep `--color-danger`**, no code change. `RolesPanel.module.scss:66` is correct as written. The question was only ever open because the "other three panels" comparison was false — there is one `.deleteButton` repo-wide, so there was no majority to align with. Item is fully closed                                                                                                                                                      |
| **E3**  | ✅ CLOSED | —— it was never a user call. #306 wrote the answer into `collectionStorage.ts:47-55`: the guards are deliberate, unreachable through this module's API but reachable from a foreign sessionStorage write or a non-string slug, where dropping them returns `undefined` through a declared `T \| null`. Pinned by mutation M3. Keep them; 0 code. **SIXTH occurrence of the board's dominant failure mode, and the first that was answered-but-still-blocked rather than shipped-but-unticked** |

### ◐ E6 · `useCollectionEdit` refresh helpers — shipped bullets and close-out history (bullets 2 and 3, `_deletedIds`)

_Moved from the live board 2026-08-29. Bullet 1 (the three refresh copies) is still open there,
BLOCKED on the user. Everything below is the record of the shipped half._

#### CLOSE-OUT 2026-08-28 (2) — the picked run landed in full: #341, #342, #343

**All three MRs of the previous run merged.** `_deletedIds` (#341) and bullet 3 (#342) are done, so
**E6 is down to bullet 1 alone, and bullet 1 is BLOCKED on the user.** F3's logger bullet (#343) is
recorded in that item.

| MR | What | Src | Test | Suite after |
| --- | --- | --- | --- | --- |
| [#341](https://github.com/themancalledzac/edens.zac/pull/341) | `_deletedIds` removed from `handleDeleteSuccess` | +28/−31 | 3 call sites edited | 245 / 4454 |
| [#342](https://github.com/themancalledzac/edens.zac/pull/342) | `buildRemoveFromCollectionDiffs` shared | +43/−21 | +65 (6 new specs) | 245 / 4460 |

**The helper did NOT go where this item predicted.** The run note said `collectionEditUtils.ts`.
It went to `app/components/Metadata/metadataUtils.ts` — that is where `buildImageUpdateDiff` (which
it calls) and its sibling `buildImageUpdatesForBulkEdit` live, and both call sites already imported
from it. `useMetadataSubmit` reaches into `collectionEditUtils` for exactly one revalidate
function; putting a diff builder there would have widened that cross-directory edge for nothing.
**Rule: put a shared helper where its own dependencies live, not where the louder caller lives.**

**Estimate vs actual — the "≈break-even" call was right, and the reason generalizes.** Bullet 3 came
in at src net **+22**, the third consecutive E6 extraction to GROW the file (bullet 2 was +11).
16 of the 31 new lines in `metadataUtils.ts` are the docblock the no-inline-comments rule requires;
the dedup saves 9 lines of body against 15 lines of helper body. **The `−90 src` on this item's
MR-board row is now definitively dead** — every bullet on E6 that could be measured came in
positive. Any remaining item on this board that promises negative source lines from an EXTRACTION
should be re-read as ≈+20 before it is scheduled.

**A dead param is not a free deletion — Prettier moved 3 lines that no edit touched.** Emptying
`handleDeleteSuccess`'s parameter list let Prettier collapse `useCallback(\n  async (…) => {` onto
one line and de-indent the whole body. That is why #341 reads +28/−31 for what is four edits, and it
is a **third** demonstration of F1's re-derive rule — this time with no helper inserted at all.
**Formatting is a hunk. A four-line change can still move every ref below it.**

**Zero test churn again, on both MRs.** #341 edited 3 existing call sites (they passed an array to a
function that now takes none); #342 edited no existing test at all and added 6 specs for the new
builder. The ±20 budget this item once carried has now over-estimated three times running.

**The rejection test passed cleanly for the first time on this item.**
`buildRemoveFromCollectionDiffs(images, collectionId, availableFilmTypes?)` — three params, **zero**
behavior switches. Contrast bullet 1 at 3-of-6. That contrast is the item's most useful artifact:
the same test that killed bullet 1 and F3's `invites.ts` green-lit this one, so it is discriminating
rather than merely conservative.

- **~~The dead `_deletedIds` parameter~~ REMOVED 2026-08-28 — PR #341, MERGED.** `handleDeleteSuccess` is now `() => Promise<void>` on `UseCollectionEditResult:285`. `MetadataModal`'s `onDeleteSuccess`/`onRemoveFromCollectionSuccess` props deliberately KEPT `(ids: number[]) => void` — `useMetadataSubmit:190/:198/:225` (**were `:189/:197/:229`; re-derived 2026-08-29**) passes real ids and its tests assert on them; a zero-arg handler is assignable, so `EditModeLayer.tsx:365-366` needed no edit. Original filing kept below.

- ~~**The dead `_deletedIds` parameter is still open and is now the cheapest thing on this item.**~~
  Untouched by bullet 2. `useCollectionEdit.tsx:1060` (**was `:1043`**, +17) still takes
  `async (_deletedIds: number[])` and never reads it, still fed by `:1119` (**was `:1102`**)
  computing `imageSubset.map(img => img.id)`. It is still on the public `UseCollectionEditResult`
  type at `:285` — **that ref did NOT drift**, the interface sits above bullet 2's insertion point.

> **REF DRIFT, ROUND 2 — from #341 and #342 (2026-08-28), applies on top of everything below.**
> The file is now **1,751 lines** (was 1,759). Two hunks, two different offsets:
> **+0 at or above `:1058`, −3 between `:1059` and `:1100`, −8 at or below `:1101`.**
> Re-derived and re-confirmed against `main` at `652d5bb`: `adoptSaveResponse:740` (unchanged),
> `handleUpdate:753` (unchanged), `handleMetadataSaveSuccess:1007` (unchanged),
> `handleGifSaveSuccess:1038` (unchanged), `handleDeleteSuccess:1059` (unchanged — it is the
> collapse point), `handleBulkRemove:1088` (**was `:1091`**), `enterReorder:1404` (**was
> `:1412`**). **Everything in the older note below is superseded where the two disagree.**

> **Ref drift from bullet 2, applies to the whole E6 section below.** `adoptSaveResponse` added 11
> net lines at `:740`. The shift is **not uniform** — the 27-line helper inserts before
> `handleUpdate`, then each of the two call-site collapses removes 8 more lines further down, so a
> ref moves +23, +17 or +11 depending on which of the three edits it sits below. Every ref above
> `:740` is unchanged. **Do not apply a single offset; use these re-derived values.**
> `handleUpdate:730` → **`:753`**, `handleMetadataSaveSuccess:990` → **`:1007`**,
> `handleGifSaveSuccess:1021` → **`:1038`**, `handleDeleteSuccess:1042` → **`:1059`**,
> `handleBulkRemove:1074` → **`:1091`**, `enterReorder:1395` → **`:1412`**. File is **1759** lines,
> not 1748. The prose further down this item still carries the pre-bullet-2 numbers; trust this list.

#### The original filing — bullet 2's rationale, kept for history

**Bullet 2 only — extract `adoptSaveResponse`.** Three reasons, and the third is the one
that decided it.

It is the only bullet on this item with **no behavior question attached**. `handleUpdate:745-751`
and `enterReorder:1425-1431` are the same seven lines in the same order; the lift is mechanical and
its correctness is checkable by reading. Bullets 1 and 3 are not like that — see below.

Its refs are as fresh as they get. `git diff --name-only d784bc5..fed67e8 --
app/components/ContentCollection/edit/` returns nothing, so nothing in this file moved under #336 or
#337, and all six function refs were re-confirmed on `main` at `fed67e8` on 2026-08-28.

And **the two things that made E6 look risky are both gone.** The ±100 test-churn budget rested on a
call-order assertion that does not exist, and this session's sweep of the four UNSTAMPED items
means E6 is now the largest COLD item with no user question in front of it. F1 is bigger but is
pure size; E6 bullet 2 is small, verified, and shrinks the file F1 will later split.

**Guardrail — do bullet 2 ONLY. Leave bullets 1 and 3 alone and report what changing them would
cost.** They are the adjacent tempting changes and both look like the same kind of lift:

- **Bullet 1 (the three refresh copies) is not a refactor, it is a behavior change.** The three
  differ on four axes — `handleMetadataSaveSuccess:990` adopts LAST through `mergeNewMetadata` and
  calls `updateImagesInCache`; `handleGifSaveSuccess:1021` adopts FIRST and **omits
  `revalidateMetadataCache` entirely**; `handleDeleteSuccess:1042` adopts first, keeps it, and is
  the only one that fails loudly. Consolidating means either 3–4 options params or deciding that the
  gif path starts firing `revalidateMetadataCache`. **That decision is the user's.** Also: extend
  `refreshCollectionAfterOperation` (`collectionEditUtils.ts:338`, already used at three of the six
  sites) rather than writing a new helper.
- **Bullet 3 should narrow to the diff builder before anyone touches it.** `handleBulkRemove:1090-1099`
  and `useMetadataSubmit.ts:216-225` share a near-identical `map` body, but the handlers around it
  differ and the confirm wording is pinned by `useCollectionEdit.bulkRemove.test.tsx:180-184`.
  Share `buildRemoveFromCollectionDiffs`; do NOT unify the handlers or the strings.

**Apply the rejection test to both before proposing either** — write the shared signature first, and
if a third of its parameters exist only to switch behavior between callers, they are not duplicates.
That test has now killed two items in two days (F3's `invites.ts`, E7's hook), and bullet 1 is the
next candidate to fail it.

**Also in scope if the pass is quick: the dead `_deletedIds` parameter** at
`useCollectionEdit.tsx:1043`, never read, fed by `handleBulkRemove:1102` computing
`imageSubset.map(img => img.id)` purely to satisfy it. It is on the public `UseCollectionEditResult`
type at `:285`, so removing it changes callers — which is why it belongs to E6 rather than to a
drive-by.

- [x] ~~`handleUpdate` and `enterReorder` duplicate the save-adoption block → `adoptSaveResponse`.~~
      **SHIPPED 2026-08-28 — PR #339, MERGED (`4ac6026`), +11 src / 0 test.** `adoptSaveResponse` is a
      `useCallback` at `useCollectionEdit.tsx:740`, called at `:768` (`handleUpdate`) and `:1434`
      (`enterReorder`; **was `:1442`, re-derived 2026-08-29**). Hook-local, not a `collectionEditUtils` export — the block mutates
      `seededCollectionIdRef`/`seededFromAdminRef` and calls `setCurrentState`/`setUpdateData`, so a
      module-level helper would have taken five injected params to move seven lines and would have
      failed the rejection test.
      **Test churn was ZERO, not ±20.** All six suites pass untouched (122 tests), full suite
      245/245, 4454 tests. No test file was edited. The ±20 budget was still an over-estimate after
      the ±100 one was corrected.
      **The file GREW by 11 lines (1748 → 1759), it did not shrink.** The dedup saves 16 lines and
      the helper costs 27, of which 9 are the docblock the project's no-inline-comments rule
      requires. Anyone costing the remaining E6 bullets by "lines removed" should assume the same
      shape: each extraction here trades duplicated code for a documented helper and roughly breaks
      even. The `−90 src` figure on the MR-board row is not achievable from bullets 1 and 3 either.
- [x] ~~`handleBulkRemove` duplicates `useMetadataSubmit.handleRemoveFromCollection` → shared builder.~~
      **SHIPPED 2026-08-28 — PR #342, MERGED, src net +22 / +6 new tests.**
      `buildRemoveFromCollectionDiffs` is an export of `app/components/Metadata/metadataUtils.ts`,
      called from `useCollectionEdit.tsx:1104` and `useMetadataSubmit.ts:217` (**was `:216`; off by
      one, re-derived 2026-08-29**). The handlers were
      NOT unified and the confirm strings were NOT touched, exactly as the guardrail required.
- [x] ~~Sequencing (added 2026-08-22): E6 is a slice of F1's decomposition — do E6 first or fold it
      into F1, not both independently.~~ Superseded by events: bullets 2–3 shipped standalone, and the
      board now recommends folding the remaining bullet 1 into F1. ~~And `useCollectionEdit.handlers.test.tsx` asserts on
      `collectionStorage.update`/`updateFull` CALL ORDER — a consolidated helper that reorders those
      calls moves assertions (budget ±100 test churn across the six suites).~~

**VERIFIED 2026-08-27 against `main` at `d784bc5`, nothing changed. The call-order claim is FALSE
and the churn budget with it.** `useCollectionEdit.handlers.test.tsx` (908 lines) contains **zero**
call-order assertions on `collectionStorage.update`/`updateFull`. Its only two `collectionStorage`
assertions are `:124-125`, both order-independent `toHaveBeenCalledWith`. The single
`invocationCallOrder` assertion in any of the six suites is in a DIFFERENT file
(`useCollectionEdit.test.tsx:283-285`) on DIFFERENT mocks — it pins `reorderCollectionContent`
before `updateCollection`, the failure-safety ordering documented at `useCollectionEdit.tsx:1421`
(WRITE A) and `:1429` (WRITE B) (**were `:1412`/`:1420`; +17 by #339, then −8 by #341/#342**), and it sits BEFORE the adoption block, so extracting `adoptSaveResponse` cannot touch
it. **There is nothing to reorder. Budget ±20, not ±100** — the six suites hold ~122 tests total, so
±100 would have meant rewriting 80% of them, which should have been the tell.

**Drift note the bullet-2 sweep got wrong, found 2026-08-28 (2).** #339's re-derived list named six
functions and was accurate for all six — but it did not sweep the PROSE, and the
`refreshCollectionAfterOperation` call sites two paragraphs up sat at `:871`/`:922` for a day
after #339 shifted them to `:888`/`:939` (+17). They are correct now. **A drift sweep that fixes
the checklist and skips the paragraphs leaves the paragraphs wrong**, and the paragraphs are what a
fresh session actually reads first.

**And the three "copies" are not copies — consolidating them is a BEHAVIOR change, not a
refactor.** `handleMetadataSaveSuccess:990-1019` adopts LAST through `mergeNewMetadata` and calls
`updateImagesInCache`; `handleGifSaveSuccess:1021-1040` adopts FIRST and **omits
`revalidateMetadataCache` entirely**; `handleDeleteSuccess:1042-1072` adopts first, keeps
`revalidateMetadataCache`, and is the only one that fails LOUDLY (`setError` + `logger.warn`) where
the other two return silently. Four axes of variation. One helper serves all three only with 3–4
options params, or by accepting that the gif path starts firing `revalidateMetadataCache` and that
adopt-ordering is normalized. **Both are decisions for the user, not mechanics** — flag them before
starting rather than discovering them mid-PR.

**Bullet 2 is the clean one and is unaffected by any of the above.** `handleUpdate:745-751` and
`enterReorder:1425-1431` are the same seven lines in the same order. `adoptSaveResponse` is a
straight lift with no behavior question. **If E6 is picked and time is short, do this bullet alone.**

**Refs RE-CONFIRMED on `main` at `fed67e8` (2026-08-28), zero drift.** `git diff --name-only
d784bc5..fed67e8 -- app/components/ContentCollection/edit/` returns nothing — neither #336 nor #337
touched this directory, so every line number above still lands on its named function:
`handleUpdate:730`, `handleMetadataSaveSuccess:990`, `handleGifSaveSuccess:1021`,
`handleDeleteSuccess:1042`, `handleBulkRemove:1074`, `enterReorder:1395`. File is 1748 lines.
**This item is fully specified and needs no discovery pass before it starts.**

**Bullet 3 should narrow to the diff builder only.** `handleBulkRemove:1090-1099` and
`useMetadataSubmit.ts:216-225` share a near-identical `map` body (same `filter` + same
`buildImageUpdateDiff`), but everything around it differs — `useMetadataSubmit` wraps in `runSave`
and closes the modal, `handleBulkRemove` manages its own loading/error and calls
`handleDeleteSuccess`. Share `buildRemoveFromCollectionDiffs`; keep the handlers separate. **Do not
unify the confirm strings** — `useCollectionEdit.bulkRemove.test.tsx:180-184` pins the wording.

**Dead parameter found, not fixed here.** `useCollectionEdit.tsx:1043` takes
`async (_deletedIds: number[])` and never reads it; `handleBulkRemove:1102` computes
`imageSubset.map(img => img.id)` purely to feed it. Both sides can drop it, but it is on the public
`UseCollectionEditResult` type at `:285`, so callers change — that makes it E6's business rather
than a drive-by.

**Where the shipped bullet 3 stood before it shipped (assessment kept for the estimate record).**
Extracting `buildRemoveFromCollectionDiffs` from `handleBulkRemove:1107-1116` (**was `:1090-1099`** — bullet 2
shifted it +17) and `useMetadataSubmit.ts:216-225` (unchanged, different file) removes about 10
duplicated lines and adds a helper plus its
docblock — the same roughly-break-even shape bullet 2 turned out to have, and it lands the helper
in a third file. Its real value is not line count, it is that the two copies can drift; nothing
currently pins them to each other. **Startable any time, no user decision needed**, but it should
be sold as drift-protection, not as a size win. Do not unify the handlers or the confirm strings
(`useCollectionEdit.bulkRemove.test.tsx:180-184` pins the wording).

### ◐ E7 · Edit-grid handoff — close-out history (the waste FIXED #337; the hook REJECTED)

_Moved from the live board 2026-08-29. The two remaining wasted paths are open there. Line refs in
this section are as-measured pre-#337 (2026-08-27); the current equivalents, re-derived 2026-08-29:
`contentBlocks` memo `:424`, grid read `:531`, `{!editLayerMounted && grid}` `:558`, `EditModeLayer`
`:559`, `applyVisibilityScope` call `:300`, `filteredImages` `:343`, `filteredAvailableOptions`
`:373`, `selectsEnabled` `:225`._

**The item was half right, and its prescription did not follow from its own evidence.** Verified
against `main` at `d784bc5`. The double run is real. But only the process → sort half is wasted, and
the fix for it is a four-line guard, not a shared hook.

**SHIPPED 2026-08-27 — PR #337.** `CollectionPageClient.tsx`'s `contentBlocks` memo now
short-circuits once `editLayerMounted` is true. Src `+22/−0`, test `+87/−3` (3 new specs), measured
with `git diff --cached --numstat` per group rather than quoted from memory.

**Suite/test counts. `main` at `fed67e8` (both #336 and #337 merged) was 245 suites / 4454 tests.**
(**That reading aged out the moment #342 merged — post-#342 the recorded figure is 245 / 4460,
itself pending a fresh re-measure. Never quote either without stashing and re-running.**) The
number moved THREE TIMES inside one day's work, every move legitimate:

| When                  | Reading        | What moved it                             |
| --------------------- | -------------- | ----------------------------------------- |
| #324 close-out, 08-24 | 245 / 4399     | stamped "quote from here on"              |
| #336 branch, 08-27    | 246 / 4451     | E2 merges (#332/#333/#334) added 52 tests |
| #337 branch, 08-27    | 246 / 4454     | this item's 3 new specs                   |
| `main`, 08-28         | 245 / 4454     | #336 deleted `tests/lib/api/user.test.ts` |

**Every one of those was correct when taken, and all of them are wrong now.** That is the whole
argument for the re-measure rule: a baseline is a measurement with a timestamp, not a fact about the
repo. The 246 readings were taken while #336 was open, so they counted a suite main no longer has.
**Re-measure by stashing the tree and running the suite; never quote a recorded number.**

**What was actually being wasted.** `contentBlocks` is defined at `CollectionPageClient.tsx:407`,
read at exactly one place (`content={contentBlocks}`, `:509`, inside `grid`), and `grid` renders
only under `{!editLayerMounted && grid}` at `:536`. So after the edit layer mounts, every filter
change ran a full `processContentBlocks` + `applySort` pass whose result nothing rendered.
**Confirmed by `grep -n "contentBlocks\|editLayerMounted\|const grid"`, which returns those four
lines and nothing else.** `EditModeLayer` is a child (`:537`), gets `filterState` as a prop, and is
created by `dynamic()` with no `React.memo` — so memoization never prevented the double run.

**The hook is rejected, and the reason is the same one that killed F3's `invites.ts`: the shared
thing is not shared.** The two sites' filter blocks are character-identical
(`CollectionPageClient.tsx:332-335`, `EditModeLayer.tsx:169-172`) but consume DIFFERENT `allContent`
— the parent scopes through `applyVisibilityScope(rawContent, filterState.showHidden)` (`:284-296`),
the layer does not (`EditModeLayer.tsx:149-152`). Same code, different domain, different output,
both used. And the process/sort calls pass opposite arguments: `filterVisible` `true` vs `false`,
`showProtectedCovers` absent vs `true`, `collection.*` vs `liveCollection.*`, plus a pinned-selects
branch the layer can never reach (`selectsEnabled` requires `!editMode`, `:219-220`). `filterVisible`
is not a flag tweak — `contentLayout.ts:415-427` shows `false` both skips `filterVisibleBlocks` AND
runs `sortNonVisibleToBottom`. **A hook serving both sites takes 9–11 parameters, four of them pure
behavior switches. That signature's job would be to re-describe the differences.**

**The parent's filter work is NOT waste and was deliberately left alone.** `filteredContent` feeds
`filteredImages:337` → `filteredAvailableOptions:367-394`, which drives filter-chip greying and is
live while editing. Only `contentBlocks` is dead. Gating the wrong one would break the chips.

- [x] ~~`CollectionPageClient` and `EditModeLayer` both run the full filter → process → sort pipeline, so it runs twice per filter change while editing. Extract one hook.~~ **Waste fixed by the handoff guard (#337); hook extraction rejected — see above.**

### ◐ E9 · Download icon/hook, auth-card SCSS — shipped bullets (#300)

_Moved from the live board 2026-08-29. The `.srOnly` bullet is still open there, blocked on a user
decision._

- [x] `ClientGalleryDownload` and `FullScreenDownloadButton` share an identical SVG and an identical download-navigate/reset-timer pattern → `DownloadIcon` plus a small hook.
- [x] The login and invite `page.module.scss` files → one shared auth-card style — PR #300.
      **Not byte-identical, as this item claimed.** They differ on line 1, the header comment, which
      is why the rename shows 62% similarity rather than 100%. Lines 2–29 match
      (`md5 1c595922f7093c94149989928905d3da`). The SVGs in bullet 1 _are_ identical apart from
      `className` (`md5 8b73bb4e2b4833ac8c8876e74942b737`).

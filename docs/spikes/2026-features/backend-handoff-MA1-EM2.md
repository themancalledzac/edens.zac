# Handoff to the backend agent — MA1's clear semantics, EM2's notify list, one question

**Written 2026-09-05 by the frontend session. No code was written and no backend branch exists.**

Two frontend items wait on small backend changes, and one backend row is waiting on a frontend
answer. This document is all three, in the shape of [backend-handoff-RC3.md](backend-handoff-RC3.md):
nothing to review, nothing to take over, just the ask.

---

## 1. MA1 — answer to your `#22`, and the one thing still missing

Your `#22` (filed 2026-08-31 from the frontend's MA1, corrected 2026-09-01) says both
`PUT /collections/{id}` routes (`AdminController.java:112`, `EditController.java:70`) are already
null-guarded partial updates, and asks whether pointing the frontend's `buildFieldPatch` at that
PUT unblocks MA1.

**Answer: yes for setting a field, no for clearing one.** The frontend's `updateCollection`
(`app/lib/api/collections.ts:252`) already calls that PUT and its docblock records the partial
semantics, so MA1's per-field "set to a value" commits can target it today. What MA1 also needs,
and the PUT cannot express, is clearing a nullable field — the description, the collection date,
the location list — because on that path null means "unchanged".

**The ask, small and precedented:** a way to say "set this to null" on the existing PUT. Either an
explicit-null marker the null-guard recognises, or a `clear: ["description", "collectionDate"]`
list on the request that the write applies after the guarded fields. No new verb is required; a
`PATCH` alias is fine if you prefer the verb, but the frontend does not need it. Whichever shape
you pick, name it in the DTO so the frontend's `buildFieldPatch` has one place to read.

Until that lands the frontend builds MA1's set-a-value path; the clear path is the only part that
waits. `#22` can move from "ask the frontend" to that one change.

## 2. EM2 — separate the recipient list to store from the list to notify

Verified on `origin/main` 2026-09-04 (frontend board EM2 has the commands): `recipient_emails` has
exactly one writer, `CollectionRepository.saveGalleryAccess` (`:782`), which overwrites the whole
array with what the request sent; `CollectionService.updateGalleryAccess` (`:1661`) then mails
every address in that same array (`sendGalleryPasswordEmail`, one caller, `:1698`);
`GalleryAccessRequest` (`CollectionRequests.java:297`) has no notify field. One column is both the
stored list and the send list, so the frontend can only choose which half to break: send `[new]`
and the stored list shrinks to one address, or send the merged list and everyone is re-mailed,
which is today's behaviour.

**The ask:** a `notifyEmails` on `GalleryAccessRequest` (mail only those, store `emails` as sent),
or append semantics on `emails` with the notify set derived from what was actually new. Either
works for the frontend; the first is the smaller change and the more explicit contract. The
frontend reshape (a read-only existing-recipients list plus an add-one field on the gallery-access
form) follows your MR unchanged.

There is no row for this on your board yet — this document is the row until you file one.

## 3. A question from the collections-as-tags leftovers — confirm or dismiss

The 2026-07-19 debloat review recorded that `applyTypeSpecificDefaults` flips the entity's
HIDDEN default to LISTED on every create, and recommended shipping a fix first. The frontend's
CT group file carries that as an unverified leftover; nobody on either side has re-checked it since
2026-08-30. If it is real it is a privacy default worth its own row; if the typeless-collection
work already changed it, say so and the frontend drops the line. One grep on your side:

```bash
git grep -n 'applyTypeSpecificDefaults' origin/main -- src/main/java/
```

## Two rows you can close from the frontend side

- **`#30`** — the frontend half it was held open for shipped as
  [edens.zac#396](https://github.com/themancalledzac/edens.zac/pull/396) on 2026-09-03. The
  notify channel is the frontend board's MA4 remainder and has no backend row.
- **`FE-5`** — the frontend did it: G6 shipped as edens.zac#351 and `CLAUDE.md`'s Critical Rule
  now says the backend is not open in local dev.

And one to re-word: **`#31`** still says "MR open"; #301 merged 2026-09-04. The `isFilm`
re-measure is owed by whoever has a live backend first; the command is on the frontend board's
RC1 row.

## Board bookkeeping

MA1 and EM2 keep their rows on the frontend board. The frontend does not write to
`edens.zac.backend`; cross-repo items get specced here and handed over, which is what this
document is.

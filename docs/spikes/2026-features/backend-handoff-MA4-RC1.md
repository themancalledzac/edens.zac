# Handoff to the backend agent — MA4 mark-as-read, RC1 parents + isFilm

**Written 2026-09-01 by the frontend session. Both items are backend-owned from here.**

Two items on the frontend's [2026 feature board](../2026-features.md) needed backend work. The
frontend session built both before it was settled that `edens.zac.backend` has its own agent and
its own refactor board. **The code exists and is green; ownership transfers with this document.**

Read the "Do this first" section before touching either branch — one commit on each needs a
decision from you, and it is the only part that collides with your board.

---

## What already exists

| Item | PR                                                                    | Branch                        | State (2026-09-02)               |
| ---- | --------------------------------------------------------------------- | ----------------------------- | -------------------------------- |
| MA4  | [#300](https://github.com/themancalledzac/edens.zac.backend/pull/300) | `ma4-mark-as-read-and-search` | **MERGED** 2026-09-01            |
| RC1  | [#301](https://github.com/themancalledzac/edens.zac.backend/pull/301) | `rc1-parents-public-isfilm`   | OPEN, green — awaiting your call |

**#300 merged with its board-row commit kept rather than reverted**, so MA4 is `#30` on your board.
Nothing further is owed on the MA4 side and its frontend half is being built in `edens.zac`. The
next section therefore applies to #301 only.

Both branched off `origin/main` at `43c6f2c6`. `./mvnw test` passes on each — 1523 and 1508.

Two worktrees were left behind and are safe to remove; the branches are pushed:

```
~/Code/edens.zac.backend.worktrees/ma4-mark-as-read
~/Code/edens.zac.backend.worktrees/rc1-parents-isfilm
```

**Your main checkout was never touched.** It sat on `docs/full-board-review-2026-09-01-tenth-run`
with `2026-08-22-backend-cleanup-spike.md` and `-history.md` dirty for the whole session, and still
does. All work was done in the worktrees above.

## Do this first — the one thing that collides with your board

Each branch carries a second commit that appends a row to
`ai_docs/reviews/2026-08-22-backend-cleanup-spike.md`, the file you had open and modified all
session:

- `fed82506 docs(board): file mark-as-read as #30` (on `ma4-mark-as-read-and-search`)
- `a3f7167e docs(board): file parents-on-public-reads and the is_film backfill as #31` (on
  `rc1-parents-public-isfilm`)

Both append after the `#26` retention-TTL row and pick `#30`/`#31` because the highest number in
the file at `origin/main` was `#29`. **Neither number was checked against your uncommitted work**,
so they may already be taken.

The code and the board row are separate commits on each branch, so the simplest resolution is to
drop the docs commit and file the row yourself in your own numbering:

```bash
git revert --no-edit fed82506   # on ma4-mark-as-read-and-search
git revert --no-edit a3f7167e   # on rc1-parents-public-isfilm
```

Nothing in the code commits touches `ai_docs/`.

---

## MA4 — mark-as-read, plus server-side unread and text filters

### What it does

`V61__messages_read_at.sql` adds `read_at TIMESTAMP NULL` to `messages` and a partial index.
`PATCH /api/admin/messages/{id}/read` sets or clears it, returning 204/404 to match the delete that
already ships. `readAt` joins `AdminMessageView` as a fifth component. `GET /api/admin/messages`
gains `?unread=` and `?q=`.

Files: `MessageEntity`, `MessageRepository`, `MessageService`, `MessagesControllerAdmin`,
`MessageRequests`, plus the three matching test classes.

### Decisions worth a second opinion

**A timestamp, not a boolean.** One column answers "is it read" (NULL or not) and "when was it
first read". Mark-unread is the same UPDATE writing NULL.

**The write is `COALESCE(read_at, NOW())`.** Re-marking a read message keeps the original time
rather than moving it to now. That makes the write idempotent, which is what lets a 0 row count
mean "no such id" and keeps the 404 honest.

**`?unread=` and `?q=` are one MR because they are one WHERE clause.** Splitting them would have
meant writing that clause twice. The board explicitly asked for them folded together.

**The list and its count share one `appendFilters` fragment.** The admin list prints "N of M".
Counting unfiltered while paging filtered makes M a number about a different row set — it reads as
a broken filter rather than a stale count.

**LIKE wildcards in operator input are escaped.** `50%` is a literal someone would plausibly type;
bound unescaped it becomes a wildcard and the filter returns every row.

**The index is partial**: `(created_at DESC) WHERE read_at IS NULL`. It carries the list's ORDER BY
on the selective side — unread shrinks as mail is triaged, read grows without bound. Reading the
whole table already has V17's `idx_messages_created_at`.

### The frontend half, which is NOT in this PR

`?q=` is what the frontend needs to stop filtering only the rows already loaded — its current
search ([edens.zac#384](https://github.com/themancalledzac/edens.zac/pull/384)) is client-side over
the loaded page. That swap, plus a read/unread toggle, is frontend work and stays on the frontend
board. **It is gated on #300 merging and deploying.** Nothing needs to change in #300 for it.

### Still open under MA4 after this

The notify channel. The retention TTL shipped as your `#26` / backend #281.

---

## RC1 — populate `parents` on public reads, backfill `isFilm`

### The `parents` half is complete

Public reads returned `parents: null` for every collection, because the inverse join was only
walked on the admin manage path. The frontend's Related section could therefore show curated
siblings and nothing else.

`findAllParentCollectionsByChildId` now takes a `listedOnly` flag, mirroring the existing
`findSiblings(id, listedOnly)`. Public reads pass `true` and get **two** gates:

- `c.visibility = 'LISTED'` — a HIDDEN or UNLISTED parent is a dead link and a disclosure of a
  collection the visitor was not meant to know exists.
- `cc.visible = true` — a membership the owner hid should not resurface as a parent link.

Admin passes `false`, unchanged. So do the three internal callers, each of which needs every parent
regardless of visibility: cycle detection (`CollectionService.parentIdsOf`), the delete-time parent
recount, and `RoleGrantPropagationService.parentIdsOf`.

The mapping moved into `CollectionProcessingUtil.populateParents`, next to `populateSiblings`, so
both read paths share one copy instead of two. Cover images are deliberately not loaded — parents
render as text links, and fetching covers would add a query per read for something nothing displays
yet. **Change that if RC2 needs card rendering.**

One test seam moved as a result: `CollectionServiceTest` now verifies the delegation, and the
mapping assertions live in `CollectionProcessingUtilTest`.

### The `isFilm` half is only partly closed — this is the part that needs you

`V62__backfill_content_image_is_film.sql` restates two rules the ingest path already enforces, as
corrections rather than guesses:

- a film stock (`film_type_id IS NOT NULL`) implies film;
- a flagged film body implies film, which is what `resolveFilmCameraDefaults` does at ingest.

It deliberately does **not** infer film from a `-film` collection slug. A naming habit is not data.

The predicate is `IS DISTINCT FROM TRUE`, not `= FALSE`: the column is nullable (`ContentRepository`
reads it via `getBoolean`, which returns null on `wasNull`), and "unset" means NULL as often as
FALSE. `= FALSE` would skip exactly the rows the migration exists to repair.

**What it probably does not fix.** The counts that motivated the item are `chamonix-film` 0/5,
`vienna-film` 0/5, `gorge-50km-film` 0/7, against `dolomites-film`'s 33/33. **V23 flags exactly two
bodies** — Hasselblad 500cm and Nikon FM3A — which is almost certainly why dolomites reads 33/33
and the other three read zero. If those three were shot on a third body, V62 will not touch them.

This could not be checked: the local backend was down for the whole session, and those counts are a
**2026-08-30 measurement, not a current fact**.

**Two things to do, in order:**

1. After #301 deploys, re-measure `isFilm` across those four collections against a live backend.
2. If the three still read zero, find which camera body their images carry. Flagging a third body
   as film is a data call for the owner, not something a migration should guess. That is a
   one-word question worth batching with the others.

### Do not drift into RC2

RC2 is the weighted metadata-graph similarity score, and it is blocked on the owner's decision #1.
RC1 is the data fix that unblocks it. They are separate items.

---

## Board bookkeeping

Both items keep a row on the frontend board, marked as handed off to you, so the frontend session
does not pick them up again. The frontend will not write to `edens.zac.backend` again — cross-repo
items get specced here and handed over, which is what this document is.

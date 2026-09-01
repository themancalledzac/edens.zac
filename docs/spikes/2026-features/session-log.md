# 2026 Feature Board — session log archive

_Oldest first. The live tracker keeps only the newest two entries; older ones move here in the
same close-out that adds them._

- 2026-08-30 — board created from the three-agent sweep (specs ×22, plans ×38, numbered docs +
  handoffs + backend board), reconciled against code and git. Headline corrections: `/search` is
  NOT backend-blocked (all endpoints live in `ContentControllerProd.java`; four docs wrong);
  gallery-password BCrypt is PARKED behind a design pass (two docs wrong); Breadcrumb and the
  shared IntersectionObserver are shipped, not pending. 42 rows filed across 8 groups; 10 user
  decisions batched. Next: SD1 (`/search`), PF5 (CI), PF1 (image bytes) — with the decision batch
  asked first.

- 2026-08-31 — shipped **SD1 (#357)**, **PF5 (#356)**, **PF1 (#358)**; all merged and live in
  production. Filed **PF10** (image quality — split out of PF1, which could not do it), **PF11**
  (Node version drift) and **PF12** (gate the auto-deploy on CI). **Decision #9 answered by one
  `curl`**: production is CloudFront-fronted AWS running a live Next server, auto-deploying from
  `main` in ~15 minutes — Vercel and static-S3 eliminated. That also closed the 002 chapter's
  month-old "verify the host serves WebP" item (it does). **MA1 re-classified COLD → BLOCKED**: its
  stated prerequisite, backend `PATCH /collections/{id}`, does not exist on the backend's
  `origin/main`. **PF4 re-classified BLOCKED → COLD**: `blocks_per_page` is gone from backend
  `origin/main`. PF5 invalidated PF9's "no `.github/`" premise in the same run. Next: PF9, PF4, SD3.

- 2026-08-31 — shipped **PF4 (#360)**, **PF10 (#361)**, **PF3 (#362)**; also closed refactor-board
  **G6 (#351)** and opened-then-closed **#363**. **PF4 closed as VOID**: its backend blocker really
  had cleared (asked production, not source), but the `@todo`'s recipe fails `next build` on
  `headers()`, and its premise measured false — 8 renders, 1 backend fetch, with `force-dynamic`
  present, because `getCollectionBySlug`'s explicit `next: { revalidate, tags }` beats the
  `force-no-store` default the flag implies. Real question refiled as **PF13**. **PF10** shipped
  `qualities: [65]` + `quality={IMAGE.quality}` at eight sites for a measured 12.9% at w=1920; the
  row's "8 `sizes=` call sites" was the wrong work list (two were the BoxTree dimensions map, and
  it missed five real render sites — same count, different set). **PF3** narrowed `priority` to one
  LCP candidate, scoped `will-change` to elements actually animating (3 CSS rules → 1), and added a
  CloudFront `preconnect`: home went 2 eager / 2 preloads / 0 preconnect → 1 / 1 / 1. Filed
  **PF11** from decision #11 and **PF13** from PF4's closure. **#363 was closed on the user's
  call**: a docblock-length rule scoped to one repo belongs in `~/.claude/CLAUDE.md`, where the
  inline-comment ban it completes already lives — moved there instead. Next: PF9, PF11, PF8.

- 2026-08-31 (3) — shipped **PF9 (#365)**, **PF11 (#366)**, **PF8 (#367)**; PF group is now 5
  shipped. **Decision #9 fully closed**: the user confirmed AWS Amplify Hosting, recorded in
  `CLAUDE.md`. **PF9's own premise was half wrong** — two docs named two hosts, not three; the
  Vercel naming is six test `describe` strings, filed on the refactor board as **G7**. **PF11
  diverged from its recorded shape with cause**: `">=20"` would have named a runtime that reached
  EOL on 2026-04-30, and Next 16.3.1 already floors at `>=20.9.0`, so the floor is `">=22"` with
  `.nvmrc` at `24`. **PF8 was the estimate lesson** — three "smalls" landed +455/−108 across 14
  files, and splitting two pages around Suspense boundaries broke two test suites for purely
  structural reasons. Two follow-ups filed on the refactor board: **C12** (`.metadataToggle` has
  SaveHeart's old 36/40 tap-target gap) and **C13** (a "Zac Eden" byline where three other routes
  say "Zac Edens"). **Two items were found rotted by re-running their numbers, both far from
  anything that merged**: LY2's collapse-state heights had moved to different states entirely (the
  row named the one state that is now fine), and PF6's `// Future: reportToService()` seam does not
  exist. Both corrected; the lesson is hoisted into "How to use this doc". **EM5 re-specified** —
  the backend exposes no email-enabled flag, so it is a post-send callout on
  `reason === 'email-disabled'`. Next: ask decision #7, then EM5, PF13, SD3.

- 2026-08-31 (4) — shipped **LY2 (#369)**, **EM5 (#370)**, **SD3's badge slice (#373)**; **PF13
  (#372) re-specified rather than built**. **Decision #7 answered** — the shared-width rule holds;
  asking it narrowly is what closed it, since `pinnedWidthSpread` turned out to constrain only
  side-by-side panel columns, never a stack (a `'V'` split hands both children the full width).
  **PF13's guardrail was unsatisfiable and the run stopped on it**: `cacheComponents` is app-wide
  in Next 16.3.1, enabling it errors 19 of 21 route segments, and `Footer.tsx:29`'s `new Date()`
  blocks every prerender regardless — re-sized to 3 sittings behind PF12, filed as **decision
  #12**. **Two premises were wrong and both were found by reading behavior, not grepping strings**:
  EM5's row said no email-disabled handling existed, but `ShareCard` already had the copy keyed on
  `sent === false` alone, so it blamed the email switch for every failure; and SD3's "removable
  badges + Clear-all" was half-built, since Clear-all is the trailing ×. **Estimates missed the
  same way three times** — EM5 "one callout" landed 12 files, SD3 "one slice" landed 8, both
  through shared primitives and their test fixtures; hoisted as a new sizing rule. **Reconciliation
  found three stale things**: LY1's `rowCombination.ts:1049` → `:1055` (drift from #369's own
  docblock), MA1's `TODO(A3)` sub-task gone AND its feature already shipped (`b66c39a`), and EM2's
  "no recipient field" premise false (`InfoTab.tsx:303`). **PF12's premise verified live** — no
  branch protection, no rulesets. Next: ask decision #12, then EM2, SD3 year chips, PF12.

- 2026-08-31 (5) — shipped **PF13 step 1 (#375)**, **SD3 year chips (#376)**, and closed **PF12**
  by applying branch protection. **Decision #12 answered: adopt Cache Components, full speed**, so
  #375 joined the run and steps 2–3 are now the next run. **EM2 went BLOCKED, and the blocker was
  nowhere near where two passes had been looking** — both prior passes argued about whether
  `InfoTab` had a recipient field; it does, and it never mattered. `recipient_emails` has one
  writer, which overwrites the whole array while mailing every address in it, so the frontend can
  preserve the stored list or narrow the send, never both. **PF12's own premise was half wrong**:
  branch protection was settable as expected, but Amplify has no wait-for-checks setting to pair
  with it — the branch API exposes `enableAutoBuild` and nothing else, so the "console half" the
  row promised does not exist, and protection alone closes the hole. **SD3's browser pass earned
  its keep twice**: `year` was missing from `FILTER_PARAM_KEYS` while its own drift-guard test
  passed (the fixture omitted `years`), and `/all-collections` printed "No images match your
  filters" above three matching tiles. Filed one follow-up: a pre-existing setState-in-render
  warning on every collection page, confirmed on `main` before filing. Next: PF13 steps 2 and 3,
  then an SD3 slice. Close-out landed as **#377**.
  **Reconciliation this pass re-ran eight recorded counts and all eight held** (PF13's 19/21,
  LY1's 0 case-sensitive / 2 case-insensitive, PF6's zero Sentry + zero `reportToService` + 14-line
  `logger.ts`, PF2's zero `blurDataURL`), plus four backend facts (MA1's absent
  `PATCH /collections/{id}`, CT5's zero auto-tag hits, AU2's exactly four WebAuthn mappings, SD2's
  `withTags` still at `:109`). **Two refs did move, both inside the neighbourhood of what merged**:
  `Footer.tsx:29` is GONE — #375 removed the `new Date()` the PF13 section still described in the
  present tense as a live blocker — and `contentFilter.ts:670` drifted to `:689` because #376's own
  `year` key pushed `FILTER_PARAM_KEYS` down. **This close-out also mis-filed its own log entry**,
  labelling it `(4)` beside the existing `(4)` and placing it below rather than above; both fixed
  here. **A third stale thing, and this one was outside any recent neighbourhood**: the PF group's
  "5 shipped" had been wrong since PF3 (#362) and PF10 (#361) closed, and PF4's VOID closure was
  never counted either — the real figure is 9. It is now written with the command that derives it.
  **The estimate lesson did not take.** Entry (4) named "shared primitives plus their test
  fixtures" as the failure mode after three misses; SD3's year chips were sized as "one slice" and
  landed 17 files across 8 app and 6 test files, which is the same miss a fourth time with the rule
  already written down. The rule is not the gap — applying it at scheduling time is, so the run
  entries now carry the size call, not just the guardrail.

- 2026-08-31 (6) — **nothing shipped.** SD3's focal-length slice was built and verified as **#379**
  and then **dropped by the user before merge** — not wanted, and the stated direction is fewer
  lens-related filters rather than more. **PF13 step 2 attempted and stopped as blocked**, which is
  what its guardrail was for. Two items, two different kinds of stop; the board's job now is to not
  re-propose either. **SD3's open data question was answered along the way, and it is yes**:
  207 of 281 sampled images carry `focalLength` (74%), near-uniformly `'24 mm'`, and the gap is
  film rather than focal length — `dolomites-film` 0/30, `lisbon-film` 0/23 — so the dimension
  self-hides on film pages through the existing gate. The parser was restored from `266c56c`
  rather than rewritten; it had been deleted as an orphan because lens NAMES beat lens types, not
  because the bucketing was wrong. **PF13's stop produced two corrections, both found by building
  rather than reading.** #375 did not clear the root-layout prerender blocker: the `new Date()`
  moved into a Client Component, which still server-renders during prerender — proven by
  hardcoding the year and watching `/_not-found` start building, one variable changed. And
  `instant = false` does not make unconverted routes safe: `/search` failed the prerender carrying
  both it and a Suspense boundary, while `/collections` 500'd calling the backend mid-build and `/`
  timed out at 60s × 3. **The real blocker was nowhere in the row** — `cookies()` sits inside
  `fetchBase`, so no read can enter a `use cache` scope, and the six tagged fetches would silently
  stop caching. Three lessons hoisted into "How to use this doc" — including the one #379 taught,
  which none of the existing guardrails would have caught: a facet can be built correctly and still
  be unwanted. Next: PF13 MR 1 (hoist the cookie forwarding), re-do step 1, and **ask** whether the
  film-stock dimension is wanted before building it.

- 2026-08-31 (7) — opened **#381 (PF13 MR 1)**, **#382 (SD5 tag half)**, **#383 (AU4)**,
  **#384 (MA4 search)**; **#380 merged**. **Four PRs, after a run that shipped none** — the
  difference was that three of the four came from checking what already existed rather than
  building what the board described. **Two rows were partly already done**: MA4's delete is
  complete on both ends and the row listed it as unbuilt, and AU4 proposed building a local-session
  affordance when `/login` always worked. **Two user decisions answered**: #5 (dark stays
  site-wide — MA3 unblocked, dark mode spun out as PF14) and #8 (CloudWatch — PF6 unblocked).
  **PF2 dropped by the user after scoping**, recorded rather than deleted so it is not
  re-proposed. **The finding that outranks every item here: the local backend writes to
  production** — 5432 is an autossh tunnel to the EC2, there is no local Postgres, and every admin
  mutation at localhost edits live rows. Repeated on AU4's row because it constrains all six MA
  items. **#381 also surfaced a latent hazard left unfixed**: `collection-{slug}` is a per-principal
  response under a shared cache tag, safe today only because Next hashes headers into the cache key
  and nothing pins that. Lesson hoisted: check whether a row's work already shipped before sizing
  it — four items now. Next: MA3 §5.1, PF6, MA4 TTL, SD2.

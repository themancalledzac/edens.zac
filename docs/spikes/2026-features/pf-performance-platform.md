# PF — Performance & platform

_Context file for board items PF1–PF9 on [2026-features.md](../2026-features.md). The LCP history:
the dominant issue (hero not in server HTML) closed via PR #161's server-side layout seeding; the
rest of the 002 chapter is this group._

## PF13 · Make the home page genuinely static (Cache Components / PPR) — COLD, real work

Created by PF4's closure. PF4 asked for a segment-config flip and there is no flip to make; the
question it was really asking — can the hottest page stop rendering per request? — is still open,
and the answer is a render-path change.

The home page renders per request because two things in `CollectionPageWrapper` need the request:

- `resolveSsrViewport()` reads the User-Agent through `headers()`, so the BoxTree composes
  server-side at the right width and the first client render matches (no hydration shift).
- `meServer()` reads `cookies()` for the principal, which decides whether the "Me" tile exists and
  is `no-store` by necessity. That fetch, not the collection fetch, is the per-visitor cost —
  measured at one `/api/auth/me` hit per render.

Making the page static means moving both behind Suspense boundaries so the shell prerenders and
only the personalized slots stream.

Worth knowing before anyone starts: the collection fetch is already cached (see PF4 below), so the
prize here is the render and the `/auth/me` round trip, not the Spring call.

### RE-SIZED 2026-08-31 — this cannot be scoped to the home page

The row said "its own sitting or two" and was picked up under the guardrail "PPR the home page
only". Neither survives contact with Next 16.3.1. PPR is reached through the **`cacheComponents`
flag, which is app-wide**; `experimental.ppr` and its per-route `experimental_ppr` opt-IN are gone
(`node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`). There is no way
to enable it for one route.

Turning it on errors every segment that exports `dynamic`, `revalidate` or `fetchCache`. This repo
has **19 of its 21 route segments exporting `dynamic = 'force-dynamic'`**:

```bash
grep -rn "export const dynamic" app --include="*.tsx"     # 19
find app -name "page.tsx" -o -name "layout.tsx" | wc -l   # 21
```

The documented incremental path is opt-OUT, not opt-in: enable the flag, delete all 19
`force-dynamic` exports, add `instant = false` to every segment not being converted (there is a
codemod, `npx @next/codemod@canary cache-components-instant-false ./app`), then convert routes one
at a time. `instant` is real in 16.3.1 — `next/dist/build/segment-config/app/app-segment-config.js:144`.

**One hard blocker that `instant = false` cannot defer — NOT cleared by #375, corrected
2026-08-31 (6).** Synchronous IO during prerender is a build error regardless of opt-out.
`Footer.tsx` called `new Date().getFullYear()` from a server component in the **root layout**, so
that one line failed the prerender of every route. #375 moved the year into a Client Component,
and `grep -c 'new Date' app/components/Footer/Footer.tsx` does return **0** — but the call did not
go away, it moved to `app/components/Footer/CopyrightYear.tsx`, and **a Client Component is still
server-rendered during prerender**. The read still happens at build time.

Proven by build, not by reading. With the flag on and the 19 exports deleted, `next build` failed
to prerender `/_not-found` — a route with no data fetching at all, rendering the root layout plus
`StatusPage`. Replacing `new Date().getFullYear()` with a literal and rebuilding, changing nothing
else, made `/_not-found` build. One variable moved.

`CopyrightYear.tsx`'s own docblock states the opposite and is wrong: isolating the read in a Client
Component is true, and "so no Server Component reads Date synchronously" is true, but neither
implies the prerender is clear. Of Next's two documented escapes — Suspense plus `connection()`, or
a Client Component — step 1 took the one that does not work here. The same trap applies to any
`Date`, `Math.random()` or `crypto.randomUUID()` anywhere in a prerendered tree, client or server.

**What `/[slug]` inherits — the question the guardrail asked.** `CollectionPageWrapper` is rendered
by `app/page.tsx`, `app/[slug]/page.tsx` and `app/all-client-galleries/page.tsx`. Restructuring its
two awaits into Suspense boundaries changes the render tree for all three identically; there is no
home-only version of it short of forking the wrapper or threading a flag through it. `/[slug]` can
keep `instant = false` so it is not _validated_, but it still gets the restructured tree. So the
guardrail's premise — that the wrapper change can be confined — does not hold either.

**Adopted 2026-08-31 (decision #12): full speed.** Step 2 was then attempted on 2026-08-31 (6)
and stopped as blocked; see the build evidence below. Step 3 was not started, per its own
precondition.

**Revised work list**, in order, each a sitting:

1. **Hoist cookie forwarding out of `fetchBase`.** This is the real MR 1 and it was not on the
   list. `getServerCookieHeader()` is awaited inside `fetchBase`
   (`app/lib/api/core.ts:269`), which every server-side backend read funnels through, so no read
   can be wrapped in `use cache` — `cookies()` in a cached scope throws
   `next-request-in-use-cache`, and per `use-cache.md:196` that failure "can pass `next build` and
   fail under `next start`". Pass the cookie header in as an argument, or give the cacheable reads
   a cookie-free path. Until this lands, nothing else in the list is reachable.
2. **Re-do step 1 properly.** Move the footer year to Suspense plus `connection()`, or drop the
   dynamic year outright (a copyright line does not need to be live). The Client Component does not
   escape the prerender.
3. **Decide what the build does about the backend.** Five of the 19 `force-dynamic` exports exist
   precisely so `next build` never calls the backend — the canonical comment is at
   `app/tag/[slug]/page.tsx:11-17`. Deleting them makes the build fetch, which is what failed
   below. `instant = false` does not prevent it. Either the cacheable reads get build-time-safe
   fallbacks, or those routes need `generateStaticParams` returning nothing meaningful, or they
   stay dynamic by another means.
4. **Then** the flag flip and the codemod, with the six tagged fetches rewritten as `use cache`
   helpers carrying `cacheLife`/`cacheTag` so `/api/revalidate` still has something to invalidate.
5. **Then** convert home: Suspense around `resolveSsrViewport()` and `meServer()` in the wrapper,
   and decide what `/[slug]` and `/all-client-galleries` do with the same tree.

### ATTEMPTED AND STOPPED 2026-08-31 (6) — step 2 is not mechanical

Run under the guardrail "no behaviour change intended; verify with `next build` plus the full
suite, not by reasoning". The build is what disproved it. Every number below is from a command,
and each is reproducible by re-running it.

**Baseline.** `next build` on `main` succeeds. Every route reports `ƒ` (dynamic) except
`/_not-found`; 3 static pages generated. Nothing prerenders today.

**Flag alone.** `cacheComponents: true` and nothing else: the build fails with
`Route segment config "dynamic" is not compatible with nextConfig.cacheComponents` listing exactly
**19 files**. The board's count was right.

**Full mechanical migration.** Delete all 19 exports, then
`npx @next/codemod@canary cache-components-instant-false ./app --force` — it adds
`export const instant = false` to **21 files** (19 pages + both layouts), each with a TODO comment.
The build now attempts 22 static pages instead of 3, and **fails**:

- `/_not-found` — the root-layout `new Date()` above.
- `/collections` — `ApiError: During prerendering, fetch() rejects when the prerender is complete`,
  thrown at `app/lib/api/core.ts:236` via `getScopedAllCollections`
  (`app/lib/api/collections.ts:130`), called from `app/collections/page.tsx:100`. This is the
  build-container-cannot-reach-the-backend case the force-dynamic comments were written for.
- `/` and `/search` — `Failed to build ... because it took more than 60 seconds`, three attempts
  each, then the export exits. `/search` fails **despite already having a Suspense boundary and
  `instant = false`**, which is the clearest single sign that the codemod is not the escape hatch
  the row assumed.

**Why `instant = false` does not rescue any of it.** It is a validation opt-out, not a rendering
one. `migrating-to-cache-components.md` says plainly that it "does not force the route to be
dynamic" and does not clear synchronous-IO build errors. The build still renders the tree, so it
still calls the backend and still evaluates `new Date()`.

**The behaviour change the guardrail was watching for is real and is in the fetches.** Under
`cacheComponents` a bare `fetch` is dynamic; `next: { revalidate, tags }` applies only inside a
`use cache` scope. Six call sites currently cache on `TIMING.revalidateCache = 3600` with tags —
`collections-index`, `collection-{slug}`, `collections-location-{slug}` (`app/lib/api/collections.ts:84,108,151`),
`content-tags`, `content-locations`, `search-images` (`app/lib/api/content.ts:42,58,139`). All six
silently stop being cached, and `revalidateTag` in `app/api/revalidate/route.ts:62,69` loses its
targets. That is a change to the hottest reads on the site, landing invisibly.

**One more thing to weigh before adopting.** The `fetch` Data Cache persists across deployments and
instances; `use cache` defaults to in-memory, scoped to one deployment and discarded on instance
teardown. On Amplify Lambda the 1-hour collection cache becomes per-instance unless a cache handler
or `use cache: remote` is configured. Measure before assuming it is a wash.

**Sequencing risk, now retired.** Merging to `main` still auto-deploys to production in ~15
minutes, but since PF12 only a commit with green CI can get to `main`. Step 2 changes caching
semantics for every route at once, which was the wrong shape to land through an ungated deploy;
that condition is gone.

Budget the test side. PF8 broke two suites purely by splitting two pages around Suspense
boundaries; this splits the wrapper three routes render through.

## PF7 · CloudFlare Phase 2

Plan: `docs/superpowers/plans/007-cloudflare-phase2.md` (gitignored). ~1–2 weeks of elapsed lead
time, no code prerequisite left (Caddy already deleted in anticipation). The sequence:

1. Proxy DNS through CloudFlare (orange-cloud the EC2 origin)
2. Restrict 80/443 to CloudFlare IP ranges in `terraform/security.tf`; close 8080
3. Rate-limit page rule on `*/api/public/*`, cache bypassed
4. Re-key the backend `RateLimitFilter` off `CF-Connecting-IP`
5. Drop the `X-Real-IP` injection in the BFF `route.ts`
6. Verify the EC2 public IP no longer answers directly

Related backend item that should precede any second public endpoint: generalize the rate-limit
config (`application.properties:79-80` is contact-specific) into a per-path map — see AU1, which
needs it for the forgot-password trigger.

## Audit debt (no rows yet — re-derive before working)

From `006-frontend-audit.md`'s retained-unique findings, verified still true: no runtime schema
validation at the API boundary (no zod); `"exactOptionalPropertyTypes": false` at
`tsconfig.json:10`; the per-file a11y inventory (`<div onClick>`, `outline:none`,
unlinked labels, `window.confirm`) is untriaged AND its file paths are stale
(`ManageClient.tsx` deleted, `ImageMetadataModal` renamed). If picked up, re-derive the inventory
against current paths first — the findings may be live, the line numbers are not.

## Closed

### ✅ PF6 · External error tracking — PR #391, 2026-08-31

**Decision #13 answered: yes.** Amplify Hosting already forwards this app's server stdout to a
CloudWatch log group, which collapsed the item to roughly a third of its worst case. No
`@aws-sdk/client-cloudwatch-logs`, no log group to create, no credentials, no execution-role
permission; `package.json` is still five dependencies. Decision #8 had already chosen CloudWatch
over Sentry.

**What shipped.**

- `app/utils/logger.ts` — one JSON object per line on the production server, because Logs Insights
  can only filter on fields it can parse. The payload is flattened first: an `Error` does not
  survive `JSON.stringify` unassisted, since `name`, `message` and `stack` are all non-enumerable,
  so the obvious version logs `{}`. `digest` rides along. Dev output and the
  `NODE_ENV === 'test'` early return are unchanged. No timestamp — CloudWatch stamps on ingest, and
  a `new Date()` here would make any render that logs dynamic under Cache Components.
- `app/api/client-errors/route.ts` — a same-origin POST whose stdout is the same stream, since a
  browser `console.error` reaches nobody. Anonymous deliberately: the viewers whose errors matter
  most never sign in. Gated on `Origin` with the shared `isAllowedWriteOrigin`, body capped at 8KB,
  every field clipped, and `context` carried as one string so a caller-chosen key cannot overwrite
  `level` or `module`.
- The `CollectionContentRenderer` cap, which the run made a prerequisite — deduped by content id,
  with a 20-per-page-load budget in the logger as the backstop for any other render-path error.
- `app/global-error.tsx` — the one boundary that was genuinely missing. It owns `<html>`/`<body>`
  and imports nothing but the logger, because anything else it imported could be what just crashed.
- `next.config.js` — `experimental.serverSourceMaps: true`. Option 3 from the table below, which
  the source-map pass had ranked best-readability-per-risk and withheld only because it needs a
  hand on the console. The user supplied the hand.

**Two deliberate deviations from the MR shape this file planned.**

- The reporter lives inside `logger.error` rather than being called from the three `error.tsx`
  boundaries. They already call `logger.error`, so one call path covers them and every other client
  error site.
- **No rate limit in the route**, though the plan listed one. A per-instance in-memory counter is
  close to useless on serverless, and shipping one would advertise a protection that is not there.
  The bounds that exist are the client budget, the body cap and the `Origin` gate. A forged
  `Origin` from a non-browser client can still flood it; volume control belongs at the edge, with
  PF7.

**Still owed by the console, not by this repo.** `serverSourceMaps` generates maps; it does not
apply them. Until `NODE_OPTIONS=--enable-source-maps` is set on the Amplify branch, server traces
stay minified and the config costs build output for nothing.

**The source-map options, priced 2026-08-31 (8).** Kept so 2, 4 and 5 are not re-proposed from
scratch. Option 1 was the recommendation while nobody could touch the console; option 3 is what
shipped once someone could.

CloudWatch Logs stores and searches text. It does not ingest maps and will not un-minify a trace
the way Sentry does on ingest. So "wire up source maps" is really five different options with
different owners:

| #   | Option                                                                      | Cost                                                                                                                            | Exposes                                                               | Reachable from this repo?                          |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Accept minified; lean on `error.digest`                                     | zero                                                                                                                            | nothing                                                               | yes — nothing to change                            |
| 2   | `productionBrowserSourceMaps: true`, symbolicate by hand per incident       | one config line, slower build, more build memory                                                                                | the whole frontend source, at public `/_next/static/**/*.js.map` URLs | yes                                                |
| 3   | `experimental.serverSourceMaps: true` + `NODE_OPTIONS=--enable-source-maps` | config line + one console env var                                                                                               | nothing public                                                        | **no** — the env var is set in the Amplify console |
| 4   | Upload maps to S3 in a `postBuild` step, symbolicate with a separate tool   | build-spec change + bucket + tool                                                                                               | nothing, if the bucket is private                                     | **no** — needs the Amplify build spec              |
| 5   | Symbolicate in-process before writing the log line                          | new runtime dependency, maps shipped in the deploy, CPU on the error path, plus a `proxy.ts` rule to 404 the public `.map` URLs | nothing public                                                        | yes, but fiddly                                    |

**Option 3 shipped.** It was already the best readability-per-risk on the list — Node applies the
maps itself, so `error.stack` is un-minified by the time `logger.error` stringifies it, with no
tooling and nothing served to browsers. The only thing holding it back was that it needs a hand on
the console, and the user supplied one when answering decision #13.

Option 1 was the recommendation while that was not true, and it is still what the client half
runs on: the digest links a user-visible ID to the full server-side entry, and all three
`error.tsx` boundaries render it. Browser traces stay minified, which is the accepted cost —
option 2 buys readability you can only use by hand, per incident, in exchange for publishing the
frontend source at a public URL permanently.

### ⛔ PF2 · Blur placeholders — DROPPED 2026-08-31 (7) by the user. Do not re-propose.

Scoped, then declined. Kept here rather than deleted so it is not rediscovered as a new idea.

**Why it was dropped.** `docs/002-performance.md:25` had already downgraded it: PR #161's SSR
BoxTree gave rows real dimensions server-side, so there is no layout shift left to fix. This was
only ever about what fills the box while bytes arrive. Weighed against the cost, the user said no.

**What it would have cost, since the scoping was done.** Real per-image blur is backend-first: a
new column (a 20px base64 JPEG is ~515 chars, ~18KB per collection page before gzip), a Flyway
migration, `ContentImageEntity`, six repository touch points, and — the bulk — a **31-component
positional record** whose four production and fourteen test construction sites all need editing.
Then a backfill over **1424 images** (`curl "localhost:8080/api/read/content/images/search?size=1"`
→ `"totalElements":1424`, re-run 2026-08-31 (7)), about half an hour unattended.

**The one genuinely cheap thing, also declined.** Next 16.3.1 accepts a raw data URI as the
`placeholder` value with no `blurDataURL` at all — verified in the shipped runtime at
`node_modules/next/dist/shared/lib/get-img-props.js:414`. A generic shimmer would have been one
edit to the shared `imageProps` object at `CollectionContentRenderer.tsx:668`. Worth knowing if
this ever comes back: the gallery funnels every image through that one object literal.

### ✅ PF12 · Gate the auto-deploy on CI — applied 2026-08-31 (no PR; repo + host settings)

`main` had **no protection of any kind** — `gh api repos/themancalledzac/edens.zac/branches/main/protection`
returned 404 and `rulesets` returned `[]`. Every merge, and every direct push, reached production
in ~15 minutes whether CI passed or not.

Applied via `gh api -X PUT .../branches/main/protection`:

- required status check `Type check, lint, test`, `strict: true` (branch must be current with
  `main` before merging, which is what catches a merge neither PR run saw)
- `enforce_admins: true`
- `allow_force_pushes: false`, `allow_deletions: false`
- no required reviews, and `required_linear_history` left off — sole maintainer, merge commits

The check context is the CI job's `name`, `Type check, lint, test`, confirmed against a live PR's
`gh pr checks` rather than read off the workflow file.

**`enforce_admins: true` is the whole item, not a detail.** Every push to this repo is by an admin,
so protection that admins bypass would have changed nothing. The cost is real and worth stating:
the owner can no longer push straight to `main`, and an emergency fix means either a PR with green
CI or temporarily turning the setting off.

**The row's second half does not exist.** It called for "the host's wait-for-checks setting,
console-only". Amplify has no such setting. `aws amplify update-branch` exposes `--enable-auto-build`
and nothing resembling a required-check or wait-for-CI option, and the app has zero webhooks
(`aws amplify list-webhooks` → `[]`). The branch is `enableAutoBuild: true`, which is the
auto-deploy; the app-level `enableBranchAutoBuild: false` governs newly created branches, not this
one.

**So branch protection alone closes the hole**, and no Amplify change was made. Only green commits
can reach `main` now, so the commit Amplify deploys on push is green by construction. The race the
row described — CI's `push: [main]` run finishing after the deploy — is now harmless, because the
PR run already gated the merge.

Gating Amplify itself remains possible but is a build-out, not a setting: turn off
`enableAutoBuild`, create an incoming webhook, and call it from a workflow that runs after CI
succeeds on `main`. That buys little on top of protection and adds a stored webhook secret, so it
is not filed as work — noted here so the next session does not re-derive it.

### ✅ PF9 · Record the deploy target — PR #365, 2026-08-31

**Production is AWS Amplify Hosting.** The 08-31 `curl -sI https://zacedens.com/` had already
established CloudFront-fronted AWS running a live Next server and eliminated Vercel (no
`x-vercel-*`) and static S3 (the response carries `next.config.js`'s own security headers, and the
home page is `force-dynamic`). The user confirmed the remaining half — Amplify specifically, not a
hand-rolled Next server behind a self-managed CloudFront. Decision #9 is fully closed.

Recorded in `CLAUDE.md` as a Critical Rule, covering the three facts that change how work is done
here: `main` auto-deploys in ~15 minutes on Amplify's build hook, CI does not gate it, and build
and routing config lives in the Amplify console rather than the repo — so console-dependent
behavior cannot be reproduced by a local `next build`.

**The row's own premise was half wrong, and finding out was the useful part.** It said three docs
named three hosts. Two did: `README.md:24` said Hosting was `AWS (S3 + CloudFront)` — corrected —
and `docs/previous-work.md:148` already said Amplify. There is no third _doc_. The Vercel naming
lives in code: six `describe('Vercel BFF proxy …')` blocks in `tests/api/proxy/route.test.ts`,
while the route's own comments (`route.ts:72-80`) are already correct about the host. Filed on the
refactor board as **G7**, because a test-file rename is cleanup rather than a docs correction.

**Two CloudFront distributions, and conflating them is what made the wrong answer plausible.**
Amplify fronts the site with its own; `d2qp8h5pbkohe6.cloudfront.net` is the S3 image CDN pinned in
`next.config.js`. README's "Storage: S3 + CloudFront" row was true and its "Hosting" row was that
same fact miscopied. The new `CLAUDE.md` rule states the separation explicitly.

Rode along: `docs/002-performance.md` item 8 ("verify Amplify serves AVIF/WebP") closed by the same
production check — the optimizer returns `content-type: image/webp`.

Est 1 sitting, actual well under. Docs only, +5/−2 across 3 files. **Gating the deploy on CI was
kept out deliberately** — that is PF12, console work, and folding it in would have made this
unrevertable.

### ✅ PF11 · Reconcile the Node version — PR #366, 2026-08-31

`.nvmrc` (`24`) is now the one place the version is written down. `engines.node` went `">=20 <23"`
→ `">=22"`, CI switched to `node-version-file: .nvmrc`, and `tests/ci/ciWorkflow.test.ts` reads
`.nvmrc` instead of the workflow's inline pin.

**The floor is `>=22`, not the `">=20"` decision #11's recorded shape sketched.** The item said to
check the release schedule, and checking changed the answer:

- **Node 20 reached end-of-life 2026-04-30.** A `>=20` floor would declare support for a runtime
  that no longer gets security patches.
- **Next 16.3.1 declares `engines.node: ">=20.9.0"` itself**, so `>=20` sat below the repo's own
  framework floor.
- Node 22 is the oldest line still supported (maintenance through 2027-04-30); 24 is Active LTS
  until 2026-10-20 and EOL 2028-04-30, the longest runway available.

Verified against `nodejs/Release`'s `schedule.json`, not recalled. The board's own note ("24 is
Active LTS and 22 is in Maintenance") was correct as far as it went and simply had not noticed 20
aging out four months earlier — **a version-schedule claim goes stale on the calendar's schedule,
not the repo's, so re-check it every time rather than trusting a recent-looking sentence.**

`setup-node` resolves a bare major from `.nvmrc` through
`^(?:node(js)?\s+)?v?(?<version>[^\s]+)$` — confirmed in the action's source, because its README
does not document the accepted formats.

The test gained two guards beyond the swap: the workflow must carry no inline `node-version:`
literal, and `engines.node` must have no upper bound. Both exist so the two-literal shape cannot
come back quietly. Net +3 tests. `.nvmrc` needs no ignore entry — it is outside both `eslint .`
and the `format` script's glob.

Est 1 sitting, actual well under: +30/−14 across 4 files. The dev machine's Node and every other
CI step were left alone.

### ✅ PF8 · Small orphans batch — PR #367, 2026-08-31

Three unrelated smalls, +455/−108 across 14 files — **by far the largest of the three "small"
items, and the estimate to carry forward is that a batch item costs the sum of its parts plus the
tests, not the size of its largest part.**

**JSON-LD.** `ImageGallery` on `/[slug]`, one type on one route per the guardrail.
`buildCollectionJsonLd` is a pure function (`app/utils/structuredData.ts`) so it is testable;
`CollectionJsonLd` is an async server component that emits the tag. It refetches the collection
rather than threading it down, which is free — `getCollectionBySlug` carries its own
`next: { revalidate, tags }` and the route already called it twice against one fetch.

Four deliberate suppressions: password-protected collections (structured data is crawlable without
the password, and the backend still returns `title` and `coverImage` on a locked response — the
same reasoning `generateMetadata` already applies to the OG image), `?manage=1`, read failures, and
a guessed `url` when `NEXT_PUBLIC_APP_URL` is unset. `serializeJsonLd` escapes `<` so a title
containing `</script>` cannot close the tag it sits in.

**Full coverage is not a frontend follow-up, which is the finding the guardrail asked for.** Three
blockers, none of them in this repo: per-image `ImageObject` needs real `width`/`height`, and
backend Bug #21 leaves dimensions at `0`; `BreadcrumbList` needs `parents`, which public reads
return as `null` (that is RC1); a `WebSite` `SearchAction` needs a query param `/search` does not
have, because it fetches the whole corpus once and filters client-side. A second type on the same
page also forces a `@graph` with `@id` cross-references — a design decision, not another script
tag. Only `CollectionPage` on `/tag/[slug]` and `/location/[slug]` is genuinely additive, roughly
one builder plus tests per route.

**Suspense.** `/explore` and `/search` each awaited a backend read in front of the whole response,
so one slow fetch held the site header too. Both now return a synchronous shell with the data
behind a boundary: `/explore` → `ExploreDirectory`, `/search` → `SearchResults` with the fallback
factored out of the existing `loading.tsx` into a shared `SearchLoadingBody` so the streaming and
navigation placeholders cannot drift.

`CollectionPageWrapper` was left alone on purpose — its two personalized reads behind boundaries is
**PF13's** whole subject, and doing it here would have collided. Worth knowing for PF13: every
route in the app is already `force-dynamic`, so none of this is the `useSearchParams` prerender
deopt; it is straightforwardly moving a blocking await inside a boundary.

**SaveHeart.** 36px, rising to 40px at `≥768px`, against a 44px minimum. Now 44px at every width
with the media query removed — the width under the minimum was the touch-only one. Its docblock had
claimed it mirrored `.metadataToggle`'s sizing, which is no longer true and now says so;
`.metadataToggle` still steps 36 → 40 and has the same gap, filed on the refactor board as **C12**.

**Trap for the next session that splits a page around a Suspense boundary.** Two suites broke, both
for the same structural reason and neither obviously: `tests/explore/page.test.tsx` rendered the
route and awaited it, which no longer reaches the data; `tests/app/slug-page.manage.test.tsx`
rendered the route and asserted on the mocked wrapper, which an unmocked async sibling now
suspends in front of. The fix in both cases is to test the extracted async component as the unit
and stub the sibling. Budget for it — the test-side cost of a Suspense split is roughly the whole
cost of the split.

**Verification note, stated because it is a real limit.** The populated JSON-LD node was never seen
end-to-end: the local backend was down, so the browser pass exercised only the degradation path
(`/film` returns 200 and emits zero `application/ld+json`). That path is genuinely verified and the
builder is unit-tested; the happy path is covered by tests only. `/explore` painting its heading
with the directory pending, `/search` painting its fallback heading, and the served CSS carrying
`width: 44px; height: 44px` with no `≥768px` override were all confirmed in the browser.

### ✅ PF3 · Priority narrowing, will-change scoping, preconnect — PR #362, 2026-08-31

Three separate changes, each verified against a build rather than reasoned about.

**Priority narrowing.** `priority` was per-row: `BoxRenderer` passed one boolean down the whole
BoxTree, so every block in the priority rows got `fetchPriority="high"` and its own preload. A
four-across first row therefore issued four competing high-priority requests when only one can be
the LCP — the other three take bandwidth from it.

`computePriorityContentId` (in `componentUtils.ts`) now scans the priority rows in render order
and returns the id of the **first block that actually renders an image**. `BoxRenderer` takes
`priorityContentId` in place of `priority` and each leaf compares its own id.

Skipping non-image leaves is the part that matters. Marking "the first leaf" would hand the flag
to a BLANK spacer whenever `buildRows`' width-normalization pass put one first, leaving the real
LCP image lazy — strictly worse than the fan-out being replaced. Blanks, admin panels and text
blocks are skipped; IMAGE, GIF and COLLECTION all count, since all three render an `<Image>`.

**`will-change` scoping.** Deliberately _not_ unified into a mixin — a mixin would still apply
unconditionally, which is the actual defect. Each of the three was scoped where it lives:

| Declaration                                          | Was                          | Now                                                                |
| ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| `CoverCard.module.scss` `.cardImage`                 | Unconditional                | Set by `useParallax` while the card is visible, cleared on cleanup |
| `ParallaxImageRenderer.module.scss` `.parallaxImage` | Unconditional                | Same — both are `.parallax-bg`, driven by the same hook            |
| `fullscreen-image.module.scss` `.zoomLayer`          | Whole time the modal is open | `.zoomLayerActive`, applied only while `isZoomed`                  |

The two parallax rules moved into the hook because the hook is the only thing that knows when the
element is animating; it already gates its scroll listener on `isVisible` from an
IntersectionObserver, so the promotion reuses a signal that was there. This is the one with real
weight: `/collections` requests up to 500 cards, and as a stylesheet rule every one of them held a
GPU compositor layer for the whole session, nearly all offscreen and none animating. The
reduced-motion branch clears it too.

The fullscreen layer trades one frame for the rest of the gesture: the first frame of a pinch is
unpromoted now, everything after it is not. Worth it against holding a promoted layer for the
whole time someone is simply looking at a photo.

Built CSS confirms it: **3** `will-change` rules before, **1** after — `.zoomLayerActive`.

**Preconnect.** `app/layout.tsx` had no `<head>` at all. It now carries a CloudFront `preconnect`
plus a `dns-prefetch` fallback. `crossOrigin="anonymous"` is required: image requests are
anonymous-CORS, and a preconnect whose CORS mode does not match opens a connection the image
request cannot reuse. The host is `CDN_ORIGIN` in `app/constants`, duplicated from
`next.config.js`'s `CLOUDFRONT_HOST` because that file cannot be imported from `app/` without
dragging the bundle analyzer into the client bundle — `tests/config/cdnHost.test.ts` asserts the
two agree, along with the CSP and the optimizer's `remotePatterns`.

**Measured**, both arms built and served against the same mock backend and the same home payload:

|                                  | Before | After |
| -------------------------------- | ------ | ----- |
| `loading="eager"` images         | 2      | **1** |
| `rel="preload" as="image"`       | 2      | **1** |
| `rel="preconnect"`               | 0      | **1** |
| `will-change` rules in built CSS | 3      | **1** |

Production before the change, for reference: home 2 eager / 2 preloads, `/collections` **4 eager /
4 preloads**, 0 preconnect on both. `/collections` is where the narrowing pays most, and the unit
tests pin that a four-item row now yields exactly one id.

### ✅ PF10 · Image quality 65 — PR #361, 2026-08-31

`images.qualities: [65]` in `next.config.js`, `IMAGE.quality` in `app/constants/index.ts`, and
`quality={IMAGE.quality}` at every optimized `<Image>`. Guard test:
`tests/config/imageQuality.test.ts`.

**The row's work list was wrong.** It said "8 `sizes=` declarations" and listed them. That grep
conflates three unrelated things:

- `BoxRenderer.tsx:159-160` and `Component.tsx:246` pass `sizes={sizesMap}` — the BoxTree
  dimensions map. Nothing to do with `next/image`.
- `LocationCollections.tsx:26` passes `sizes` to `CoverCard`, which forwards it to its own
  `<Image>` — the same call site as `CoverCard.tsx:64`, counted twice.
- It missed five real render sites that carry no `sizes` prop at all: `FullScreenModal.tsx:210`,
  `About.tsx:15`, `CollectionsPanel.tsx:100`, `EditModeLayer.tsx:338`, and the
  `<Image {...imageProps} />` spread at `CollectionContentRenderer.tsx:690`.

The right unit is the `<Image>` render site. There are ten; two (`MediaPreview.tsx:46` and `:101`)
are `unoptimized` and bypass the optimizer entirely, so **eight** needed the prop. Same number as
the row, different set — which is exactly the way this could have shipped broken.

**Why a miss breaks rather than slows.** Verified against a running optimizer, same image, w=1920:

```
q=65  →  200, 408,696 bytes, image/webp
q=75  →  400, 44 bytes
```

75 is what `next/image` sends when the prop is absent. So a forgotten `quality` is a broken image
in production. That is what the guard test is for, and why `qualities` is `[65]` alone rather than
`[65, 75]`: the permissive list would let a miss degrade silently into no savings, whereas CI now
fails loudly instead.

**Measured saving**, same image, WebP as a browser receives it:

| Width | q75     | q65     | Saving    |
| ----- | ------- | ------- | --------- |
| 1920  | 469,408 | 408,696 | **12.9%** |
| 1080  | 139,786 | 122,736 | **12.2%** |

Consistent with the 13.3% recorded pre-build on a different image.

**One judgment call worth a second opinion.** `FullScreenModal` is the surface where someone is
deliberately looking closely at a photograph, and it now gets the same 65 as a thumbnail. That is
what the item specified and it is applied uniformly, but if any surface deserves its own tier this
is the one. Making it so is cheap now: add a second constant, extend `qualities` to both values,
and the guard test keeps them in agreement.

The stale claim "Quality is not settable here in Next 16" was corrected in `next.config.js` — the
_allowlist_ is settable; only a _default_ is not.

### ✅ PF4 · Restore ISR on the home page — closed as VOID, PR #360, 2026-08-31

No behavior change shipped. The MR replaced the `@todo` in `app/page.tsx` with what the
measurements actually showed, because the comment was sending each new reader down the same
dead end. All three of the item's premises were tested; none held.

**1. The backend blocker really is gone.** Not inferred from source this time — asked of
production:

```
GET https://zacedens.com/api/proxy/api/read/collections/home?page=0 → 200, full block payload
```

**2. The `@todo`'s recipe cannot build.** Applying `export const revalidate = 3600; export const
dynamic = 'error'` and running `next build`:

```
Error occurred prerendering page "/".
Route / with `dynamic = "error"` couldn't be rendered statically because it used `headers()`.
```

`CollectionPageWrapper` awaits `resolveSsrViewport()` (which calls `next/headers`) and
`meServer()` (which calls `cookies()`). `force-static` is not the escape hatch either: it makes
both return empty, which costs the mobile SSR viewport and the logged-in "Me" tile.

**3. The stated benefit does not exist.** "Every visitor pays a live Spring fetch" is false. The
Next 16 docs say `force-dynamic` is "equivalent to `fetchCache = 'force-no-store'`"
(`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:97-99`), which
is what made the claim look right. That default governs only _unannotated_ fetches, and
`getCollectionBySlug` is annotated — `next: { revalidate: 3600, tags: ['collection-home'] }` —
so it keeps its cache entry.

Measured with a mock backend counting hits per path, behind a real `next build` + `next start`:

| Arm                             | Page renders | `/api/read/collections/home` | `/api/auth/me` |
| ------------------------------- | ------------ | ---------------------------- | -------------- |
| `force-dynamic` present (today) | 8            | **1**                        | 8              |
| `force-dynamic` removed         | 6            | **1**                        | 6              |

Identical. The collection fetch is cached either way; `/auth/me` is per-render by design.

**`force-dynamic` was kept.** It is strictly redundant — `headers()` already forces the route
dynamic — but it is the safer default: an unannotated fetch added to this tree later would
otherwise be silently cached with per-viewer data. Removing it buys nothing measurable and adds
that footgun.

**Harness note for whoever re-runs this.** Next persists its fetch cache under `<distDir>/cache`
and `next build` does not clear it. Reusing one `NEXT_BUILD_DIR` across both arms leaked the
first arm's warm cache into the second and reported _zero_ backend fetches — a clean-looking
number that was pure artifact. Use a separate `distDir` per arm.

**What survives** is the underlying question, refiled as PF13: the page still renders per request,
and making it not do so is a Cache Components / PPR change to the shared wrapper.

### ✅ PF1 · Image bytes — PR #358, merged 2026-08-31

Set `deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048]` and `imageSizes: [128, 256, 384]`.
Guard test: `tests/config/imageSizes.test.ts`.

**The source ceiling is 2500px.** Every image the backend exports is 2500px on its long edge,
measured 2026-08-30 against the live CloudFront origin across six files spanning 2019–2026
(`DSC_0045` 2500×2000, `DSC_9873-Pano` 2500×2500, `DSC_8842` 2500×2500, `000024950001` 2024×1994,
`DSC_0104` 2500×1663, `DSC_9897` 2500×1663).

Next never enlarges, so the default `deviceSizes` entries above that ceiling were the same file
under three cache keys, not higher quality:

| Requested width | Bytes returned |
| --------------- | -------------- |
| 1200            | 153,038        |
| 1920            | 298,282        |
| 2048            | 328,916        |
| 2560            | 685,082        |
| 3200            | 685,082        |
| 3840            | 685,082        |

Removing them makes 2048 the top candidate, which is the whole win. Home page HTML, before → after:
srcSet candidates `640…2048, 3840` → `640…2048`; srcSet attribute bytes 6,324 → 5,535; fallback
`src` **w=3840 (685 KB) → w=2048 (329 KB)**. The fallback `src` is what anything without srcset
support fetches, crawlers and social preview bots included. For real browsers the cap engages
above 2048 device px — e.g. `/hidden-lake`'s largest slot is 944 CSS px, so a DPR-3 device needs
2832 and selected 3840, now selects 2048. Cost is a 1.22× upscale from the 2500px source.

**Do not thin the middle.** A browser picks the smallest candidate ≥ what it needs, so deleting an
intermediate width rounds those requests UP and costs bytes. 828 stays for that reason alone. A
max-gap-ratio guard cannot express this: deleting 828 leaves a 750→1080 gap of 1.44×, smaller than
the ladder's own inherent 1200→1920 gap of 1.60×. The test asserts "defaults minus what exceeds
the ceiling" instead.

`imageSizes` drops 32/48/64/96 — the smallest `sizes` any component declares is 140px, so nothing
below 128 is selectable even at 1×.

**Quality is not config-only in Next 16**, contrary to the 002 chapter's "set quality ~65".
`imageConfigDefault.qualities` is `[75]`; `next/image` sends 75 whenever no `quality` prop is given
(`get-img-props.js:459`); and the optimizer _rejects rather than clamps_ anything outside
`images.qualities` (`image-optimizer.js:657`, HTTP 400). So `qualities: [65]` alone would 400 every
image on the site. Lowering it needs `quality={65}` at the call sites — a render-path change.
Measured prize: **q65 is 13.3% smaller than q75** (258,556 vs 298,282 bytes at w=1920). Not
ticketed; open a row if wanted.

**No Lighthouse baseline was taken.** A dev-server run measures unminified bundles and a cold
optimizer, and a production run is PF9-gated — three docs name three hosts and there is no deploy
config, so there is nowhere agreed to point it. The byte measurements above cover what this change
alters and are reproducible against the live CDN. The PF9-gated question is unchanged: whether the
host actually serves the WebP the optimizer emits.

### ✅ PF5 · Frontend CI — PR #356, merged 2026-08-31

`.github/workflows/ci.yml` — one job on `pull_request` and pushes to `main`, running `type-check`,
`lint:js`, `lint:css` and `test`. Guard test `tests/ci/ciWorkflow.test.ts`. Est 1 sitting, actual 1.

One job rather than four because `npm ci` dominates the wall clock; every check is `if: always()`
so one run reports all four verdicts. Stylelint included beyond the row's stated "tsc/jest/eslint"
because `npm run lint` in this repo means both linters and it was already green.

**Node drift, unresolved and worth a decision.** CI pins **22**, the top of `engines.node`
(`>=20 <23`). The dev machine runs **25.3.0**, which that range excludes. CI now tests the runtime
the repo claims to support while development happens on one it does not. Not changed here because
widening `engines` is a call, not a cleanup. Filed as PF11.

**Guard mutation-proved:** dropping the type-check step and pinning Node 25 each red their test.

**The deploy-automation report the row asked for is now obsolete, and that is the finding.** It was
written assuming nothing deployed automatically. Production disproved that at close-out — see PF9.

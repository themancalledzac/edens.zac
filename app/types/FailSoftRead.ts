/**
 * Outcome of a fail-soft list read — a read that must not 500 the page when it fails, but must not
 * pass its failure off as an answer either.
 *
 * `{ ok: true, items: [] }` is a genuine empty; `{ ok: false }` is "the read failed, so nothing is
 * known about this set". Shared by the session-bound reads in `app/lib/api/personal.ts` and their
 * id-parameterized admin twins in `app/lib/api/users.ts`, so `loadUserSpace` can treat both modes
 * identically.
 */

/**
 * The failure arm carries NO `items`, deliberately.
 *
 * Flattening both arms to `[]` is the bug this type exists to prevent — a section rendered from a
 * flattened failure asserts the user has nothing when the truth is that we could not find out.
 * While `items: never[]` sat on the failure arm that bug stayed one careless `.items` away and the
 * compiler had nothing to say about it. Omitting it makes `read.items` unreachable until `read.ok`
 * has been checked, so the honest branch is the only one that compiles. The two call sites that
 * genuinely want the flattened form — `listSavedImageIdsServer`, `LocationPage` — say
 * `read.ok ? read.items : []` and are documented where they do it.
 */
export type FailSoftRead<T> = { ok: true; items: T[] } | { ok: false };

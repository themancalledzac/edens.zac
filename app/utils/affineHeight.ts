/**
 * The affine height model shared by the two halves of the layout engine.
 *
 * A subtree's rendered height at width W is `H(W) = a·W + b`. A flexible leaf is the line
 * through the origin with slope 1/AR; a PINNED leaf — one whose height does not vary with
 * width — is the point `a = 0`, which is not a special case bolted onto the model but the
 * model's own expression of "height does not vary with width". Every combine rule and the
 * equal-height solve below already handle it.
 *
 * Two consumers adapt their own tree types onto this core:
 *
 * - the composer (`rowCombination.ts`), over `AtomicComponent`: `heightModel` and
 *   `splitLeftWidth` — how candidate arrangements are SCORED;
 * - the sizer (`rowStructureAlgorithm.ts`), over `BoxTree`: `computeHeightCoeffs` and
 *   `solveHboxSplit` — how the winning arrangement RENDERS.
 *
 * The two are one statement and must return the same number: the composer promises a row
 * will fill its box, and the sizer either keeps that promise or the page grows pockets. They
 * used to be four hand-mirrored function pairs enforced by comments alone, and a past
 * divergence between them is exactly where the admin hub's dead-space bug came from. This
 * module is the mirror made structural — each pair now reads one formula from one place —
 * and `tests/utils/affineHeight.mirror.test.ts` pins the residual freedom the adapters keep
 * (their leaf-AR accessors; see below).
 *
 * Signature conventions are the adapters' own: the composer's split takes the full parent
 * width and subtracts the gap itself, the sizer's takes width-minus-gap. Both normalize to
 * `availableWidth` before reaching {@link solveEqualHeightSplit}.
 *
 * What is deliberately NOT unified: the leaf aspect-ratio fallback chains. The composer
 * reads leaves through `getAspectRatio` (anything without a photographic shape — TEXT,
 * COLLECTION refs, BLANK spacers, a dimension-less PANEL — answers a neutral 1.0), the
 * sizer through `getContentDimensions` (every leaf must produce a renderable shape: a BLANK
 * encodes its aspect ratio in width/height, a COLLECTION renders its cover's, and the
 * fallback is the 1300×867 placeholder). Those chains genuinely disagree on those classes,
 * and each side's answer is correct FOR ITS JOB — a blank sized at AR 1.0 would break every
 * padded row, and a collection card packed at its cover's AR would reshuffle every catalog
 * page. They agree on everything that can appear in a pinned row (IMAGE/GIF and PANEL with
 * declared dimensions), which is the only place both models are consulted about the same
 * tree, and the mirror test pins that agreement.
 */

/**
 * Linear height coefficients: rendered height at width W is `H(W) = a·W + b`.
 *
 * For leaves, `b = 0` (no internal gaps) unless pinned (`a = 0`, `b` the pin). For nested
 * trees, `b` captures the cumulative height contribution of internal CSS gaps.
 */
export interface AffineHeight {
  a: number;
  b: number;
}

/** The model of a pinned leaf: height is a constant, so the width coefficient is zero. */
export function pinnedLeaf(pinnedHeight: number): AffineHeight {
  return { a: 0, b: pinnedHeight };
}

/**
 * The model of a flexible leaf: height tracks width along the declared aspect ratio.
 * A non-positive AR degrades to a square rather than to a negative or infinite coefficient.
 *
 * The two accessor chains keep a ZERO out by different mechanisms, and only one of them is a
 * clamp — do not read this guard as duplicating either:
 *
 * - The composer's chain clamps, explicitly. `getAspectRatio` answers a flat `1.0` for a PANEL
 *   whose declared width or height is non-positive, for anything without a photographic shape,
 *   and for a computed dimension pair that comes back non-positive.
 * - The sizer's chain never clamps. `getContentDimensions` tests each candidate pair with `&&`,
 *   so a zero (or absent) dimension is falsy and falls THROUGH to the next source and finally to
 *   the 1300×867 placeholder; its callers add a `height === 0 ? 1 : …` belt on top.
 *
 * What neither rules out is a NEGATIVE stored dimension: it is truthy, so `&&` passes it along
 * and `height === 0` does not catch it. That is the case this fallback is actually for.
 */
export function flexibleLeaf(ar: number): AffineHeight {
  return { a: ar > 0 ? 1 / ar : 1, b: 0 };
}

/**
 * Side-by-side children equalised in height by trading width. Two pinned children cannot
 * be equalised by trading width, and `sumA` is the divisor of that trade — so the general
 * formula is a 0/0 there. Side by side, the pair is as tall as its taller member.
 */
export function combineHorizontal(
  left: AffineHeight,
  right: AffineHeight,
  gap: number
): AffineHeight {
  const sumA = left.a + right.a;
  if (sumA === 0) return { a: 0, b: Math.max(left.b, right.b) };
  return {
    a: (left.a * right.a) / sumA,
    b: (-left.a * right.a * gap + left.a * right.b + right.a * left.b) / sumA,
  };
}

/**
 * Stacked children: CSS visual height is the sum of raw child heights (vbox scaling and
 * the CSS gap cancel out). That cancellation assumes something in the stack can be scaled
 * down to swallow the gap. When BOTH children are pinned nothing can, so the gap is real
 * added height and has to be declared — otherwise the parent solve sizes the stack one gap
 * shorter than it renders.
 */
export function combineVertical(
  left: AffineHeight,
  right: AffineHeight,
  gap: number
): AffineHeight {
  return {
    a: left.a + right.a,
    b: left.b + right.b + (left.a === 0 && right.a === 0 ? gap : 0),
  };
}

/** Evaluate the model: the height a subtree renders at width W. */
export function heightAt(model: AffineHeight, width: number): number {
  return model.a * width + model.b;
}

/** Declared (shape-preference) aspect ratio of side-by-side children: ARs add. */
export function combineDeclaredARHorizontal(left: number, right: number): number {
  return left + right;
}

/**
 * Declared aspect ratio of stacked children: the harmonic form, spelled as product-over-sum.
 *
 * `(l·r)/(l+r)` and `1/(1/l + 1/r)` — the spelling `tests/utils/rowStructureAlgorithm.test.ts`
 * computes its expectations in — agree to within floating-point rounding on positive finite
 * operands, which is the only population that reaches here. They are NOT interchangeable in
 * general, and the disagreements are categorical rather than ULP-scale:
 *
 * - `l = r = 0` — this form is `0/0` (NaN); the reciprocal form is `1/(∞+∞)` = 0.
 * - `l + r === 0` with opposite signs — this form is `−1/0` = −∞; the reciprocal form is +∞.
 * - either operand infinite — this form is `∞/∞` (NaN); the reciprocal form returns the finite
 *   other side.
 *
 * All three are unreachable through the accessor chains (see {@link flexibleLeaf}), so the
 * respelling is safe HERE and not in general.
 */
export function combineDeclaredARVertical(left: number, right: number): number {
  return (left * right) / (left + right);
}

/** Min-width of side-by-side children: each needs its own. */
export function combineMinWidthHorizontal(left: number, right: number): number {
  return left + right;
}

/** Min-width of stacked children: one shared column, as wide as its neediest member. */
export function combineMinWidthVertical(left: number, right: number): number {
  return Math.max(left, right);
}

/** Inputs to {@link solveEqualHeightSplit}, all in the parent hbox's frame. */
export interface EqualHeightSplitInput {
  /** Height model of the left child. */
  left: AffineHeight;
  /** Height model of the right child. */
  right: AffineHeight;
  /** Width available to the two children together — the parent's width MINUS the dividing gap. */
  availableWidth: number;
  /** Declared (shape-preference) ARs; consulted only when both children are pinned. */
  leftDeclaredAR: number;
  rightDeclaredAR: number;
  /** Subtree min-width floors; consulted only when exactly one child is pinned. */
  leftMinWidth: number;
  rightMinWidth: number;
}

/**
 * Width given to an hbox's LEFT child so both children render the same height.
 *
 * The unconstrained answer solves `aL·W + bL = aR·(available − W) + bR`. Two cases break
 * it, and both arrive with pinned heights:
 *
 * - **Both children pinned** (`aL + aR === 0`): the equation degenerates to `bL = bR` —
 *   true or false, but never a statement about W, and the division is 0/0. Heights yield
 *   no equation, so the DECLARED shapes share the width — a bar declaring twice the AR of
 *   its sibling gets twice the width. (An even split, the old rule, gave a nested pair
 *   half of what a lone sibling got, which starved declared minimums the renderer's own
 *   band would then have to undo.)
 * - **One child pinned, and the other cannot reach that height at any width it could be
 *   given**: the solve runs off the end of the row, and a bare `Math.max(0, …)` clamp
 *   would hand the pinned child ZERO width, deleting a panel from the page. Keeping the
 *   split inside the min-width band leaves both children renderable and lets the row
 *   simply be as tall as its pinned member.
 *
 * The band is applied ONLY when a pin is present. Without one, this returns the original
 * expression unchanged, so `minWidth` keeps its existing meaning everywhere else — a
 * preference over row MEMBERSHIP in the packer, not a reservation of page width here.
 */
export function solveEqualHeightSplit(input: EqualHeightSplitInput): number {
  const {
    left,
    right,
    availableWidth,
    leftDeclaredAR,
    rightDeclaredAR,
    leftMinWidth,
    rightMinWidth,
  } = input;
  const sumA = left.a + right.a;
  const declaredSum = leftDeclaredAR + rightDeclaredAR;
  const raw =
    sumA === 0
      ? availableWidth * (declaredSum > 0 ? leftDeclaredAR / declaredSum : 0.5)
      : (right.a * availableWidth + right.b - left.b) / sumA;

  if (left.a !== 0 && right.a !== 0) return Math.max(0, Math.min(availableWidth, raw));

  const floor = Math.min(leftMinWidth, availableWidth);
  const ceiling = Math.max(floor, availableWidth - rightMinWidth);
  return Math.max(0, Math.min(availableWidth, Math.min(ceiling, Math.max(floor, raw))));
}

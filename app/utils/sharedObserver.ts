/**
 * Shared IntersectionObserver Singleton
 *
 * Manages a single IntersectionObserver per unique options signature,
 * dispatching intersection events to per-element callbacks via a Map.
 * Replaces ~50+ individual IntersectionObserver instances across components,
 * reducing memory and CPU overhead.
 *
 * The registry is keyed by a serialized options string. Root elements are
 * identified via a WeakMap-based ID system to avoid toString() collisions.
 *
 * Usage:
 *   const unobserve = observe(element, callback, { threshold: 0.5 });
 *   // later:
 *   unobserve();
 *   // or:
 *   unobserve(element);
 */

type ObserverCallback = (entry: IntersectionObserverEntry) => void;

interface ObserverOptions {
  threshold?: number | number[];
  root?: Element | Document | null;
  rootMargin?: string;
}

interface ObserverRecord {
  observer: IntersectionObserver;
  callbacks: Map<Element, ObserverCallback>;
}

const registry = new Map<string, ObserverRecord>();

let rootIdCounter = 0;
const rootIds = new WeakMap<Element | Document, number>();

function getRootId(root: Element | Document | null | undefined): string {
  if (!root) return 'viewport';
  if (!rootIds.has(root)) rootIds.set(root, ++rootIdCounter);
  return `root-${rootIds.get(root)}`;
}

function serializeOptions(options: ObserverOptions): string {
  const threshold = Array.isArray(options.threshold)
    ? options.threshold.join(',')
    : String(options.threshold ?? 0);
  return `${threshold}|${options.rootMargin ?? '0px'}|${getRootId(options.root)}`;
}

function getRecord(options: ObserverOptions): ObserverRecord {
  const key = serializeOptions(options);

  if (registry.has(key)) {
    return registry.get(key)!;
  }

  const callbacks = new Map<Element, ObserverCallback>();

  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        const cb = callbacks.get(entry.target);
        if (cb) {
          cb(entry);
        }
      }
    },
    {
      threshold: options.threshold ?? 0,
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? '0px',
    }
  );

  const record: ObserverRecord = { observer, callbacks };
  registry.set(key, record);
  return record;
}

/**
 * Start observing an element with a callback.
 * Returns an unobserve function for cleanup.
 */
export function observe(
  element: Element,
  callback: ObserverCallback,
  options: ObserverOptions = {}
): () => void {
  const record = getRecord(options);
  record.callbacks.set(element, callback);
  record.observer.observe(element);

  return () => {
    unobserve(element, options);
  };
}

/**
 * Stop observing an element.
 * If no elements remain for this observer, it is disconnected and removed.
 */
export function unobserve(element: Element, options: ObserverOptions = {}): void {
  const key = serializeOptions(options);
  const record = registry.get(key);

  if (!record) return;

  record.observer.unobserve(element);
  record.callbacks.delete(element);

  if (record.callbacks.size === 0) {
    record.observer.disconnect();
    registry.delete(key);
  }
}

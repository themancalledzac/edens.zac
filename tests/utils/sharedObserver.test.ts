import { observe, unobserve } from '@/app/utils/sharedObserver';

type ObserverCallback = IntersectionObserverCallback;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  observed = new Set<Element>();
  observe = jest.fn((el: Element) => {
    this.observed.add(el);
  });
  unobserve = jest.fn((el: Element) => {
    this.observed.delete(el);
  });
  disconnect = jest.fn();
  constructor(
    public callback: ObserverCallback,
    public options?: IntersectionObserverInit
  ) {
    MockIntersectionObserver.instances.push(this);
  }
  trigger(targets: Element[]) {
    this.callback(
      targets.map(target => ({ target }) as IntersectionObserverEntry),
      this as unknown as IntersectionObserver
    );
  }
}

describe('sharedObserver', () => {
  const original = globalThis.IntersectionObserver;
  let cleanups: Array<() => void>;

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    cleanups = [];
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    for (const cleanup of cleanups) cleanup();
    globalThis.IntersectionObserver = original;
  });

  const track = (cleanup: () => void) => {
    cleanups.push(cleanup);
    return cleanup;
  };

  it('shares one IntersectionObserver for elements with the same options', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    track(observe(a, jest.fn(), { threshold: 0.5 }));
    track(observe(b, jest.fn(), { threshold: 0.5 }));

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0]!.observed).toEqual(new Set([a, b]));
  });

  it('creates separate observers for different options', () => {
    track(observe(document.createElement('div'), jest.fn(), { threshold: 0.1 }));
    track(observe(document.createElement('div'), jest.fn(), { threshold: 0.9 }));
    track(observe(document.createElement('div'), jest.fn(), { rootMargin: '10px' }));

    expect(MockIntersectionObserver.instances).toHaveLength(3);
  });

  it('separates observers by root element', () => {
    const rootA = document.createElement('div');
    const rootB = document.createElement('div');
    track(observe(document.createElement('div'), jest.fn(), { root: rootA }));
    track(observe(document.createElement('div'), jest.fn(), { root: rootA }));
    track(observe(document.createElement('div'), jest.fn(), { root: rootB }));

    expect(MockIntersectionObserver.instances).toHaveLength(2);
  });

  it('applies default options to the underlying observer', () => {
    track(observe(document.createElement('div'), jest.fn()));

    expect(MockIntersectionObserver.instances[0]!.options).toEqual({
      threshold: 0,
      root: null,
      rootMargin: '0px',
    });
  });

  it('dispatches entries to the callback registered for the target', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const cbA = jest.fn();
    const cbB = jest.fn();
    track(observe(a, cbA, { threshold: 0.3 }));
    track(observe(b, cbB, { threshold: 0.3 }));

    MockIntersectionObserver.instances[0]!.trigger([a]);

    expect(cbA).toHaveBeenCalledTimes(1);
    expect(cbA.mock.calls[0][0].target).toBe(a);
    expect(cbB).not.toHaveBeenCalled();
  });

  it('stops callbacks after the returned unobserve function runs', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const cbA = jest.fn();
    const cbB = jest.fn();
    const stopA = observe(a, cbA, { threshold: 0.4 });
    track(observe(b, cbB, { threshold: 0.4 }));
    const instance = MockIntersectionObserver.instances[0]!;

    stopA();
    instance.trigger([a, b]);

    expect(instance.unobserve).toHaveBeenCalledWith(a);
    expect(cbA).not.toHaveBeenCalled();
    expect(cbB).toHaveBeenCalledTimes(1);
  });

  it('stops callbacks after unobserve(element, options)', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const cbA = jest.fn();
    track(observe(a, cbA, { threshold: 0.6 }));
    track(observe(b, jest.fn(), { threshold: 0.6 }));
    const instance = MockIntersectionObserver.instances[0]!;

    unobserve(a, { threshold: 0.6 });
    instance.trigger([a]);

    expect(cbA).not.toHaveBeenCalled();
  });

  it('disconnects and discards the observer when the last element is removed', () => {
    const a = document.createElement('div');
    const stop = observe(a, jest.fn(), { threshold: 0.7 });
    const first = MockIntersectionObserver.instances[0]!;

    stop();

    expect(first.disconnect).toHaveBeenCalledTimes(1);

    track(observe(a, jest.fn(), { threshold: 0.7 }));
    expect(MockIntersectionObserver.instances).toHaveLength(2);
  });

  it('does not disconnect while other elements remain', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const stopA = observe(a, jest.fn(), { threshold: 0.8 });
    track(observe(b, jest.fn(), { threshold: 0.8 }));

    stopA();

    expect(MockIntersectionObserver.instances[0]!.disconnect).not.toHaveBeenCalled();
  });

  it('ignores unobserve for options that were never registered', () => {
    expect(() => unobserve(document.createElement('div'), { threshold: 0.123 })).not.toThrow();
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});

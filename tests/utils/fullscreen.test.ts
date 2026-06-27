/**
 * Unit tests for the native Fullscreen API wrappers. jsdom implements none of the Fullscreen API,
 * so each test installs the exact members it needs onto a fresh element / the document and removes
 * them afterward. This both documents the feature-detection branches and proves the helpers never
 * throw when the API is missing or rejects.
 */
import {
  exitFullscreen,
  fullscreenElement,
  isFullscreenSupported,
  onFullscreenChange,
  requestFullscreen,
} from '@/app/utils/fullscreen';

type TestElement = HTMLElement & {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type TestDocument = Document & {
  webkitFullscreenElement?: Element | null;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void> | void;
};

const docEl = () => document.documentElement as TestElement;
const testDoc = () => document as TestDocument;

afterEach(() => {
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
  Reflect.deleteProperty(document.documentElement, 'webkitRequestFullscreen');
  Reflect.deleteProperty(document, 'webkitFullscreenElement');
  Reflect.deleteProperty(document, 'exitFullscreen');
  Reflect.deleteProperty(document, 'webkitExitFullscreen');
});

describe('isFullscreenSupported', () => {
  it('is false when neither the standard nor webkit request exists', () => {
    expect(isFullscreenSupported()).toBe(false);
  });

  it('is true when the standard requestFullscreen exists', () => {
    docEl().requestFullscreen = jest.fn(() => Promise.resolve());
    expect(isFullscreenSupported()).toBe(true);
  });

  it('is true when only the webkit request exists', () => {
    docEl().webkitRequestFullscreen = jest.fn();
    expect(isFullscreenSupported()).toBe(true);
  });
});

describe('fullscreenElement', () => {
  it('returns null when nothing is fullscreen', () => {
    expect(fullscreenElement()).toBeNull();
  });

  it('falls back to the webkit fullscreen element', () => {
    testDoc().webkitFullscreenElement = document.body;
    expect(fullscreenElement()).toBe(document.body);
  });
});

describe('requestFullscreen', () => {
  it('returns false for a null element', async () => {
    await expect(requestFullscreen(null)).resolves.toBe(false);
  });

  it('returns false when the element exposes no fullscreen API', async () => {
    await expect(requestFullscreen(document.createElement('div'))).resolves.toBe(false);
  });

  it('calls the standard API and resolves true', async () => {
    const el = document.createElement('div') as TestElement;
    const spy = jest.fn(() => Promise.resolve());
    el.requestFullscreen = spy;
    await expect(requestFullscreen(el)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('falls back to the webkit API and resolves true', async () => {
    const el = document.createElement('div') as TestElement;
    const spy = jest.fn();
    el.webkitRequestFullscreen = spy;
    await expect(requestFullscreen(el)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('resolves false when the request rejects (e.g. no user gesture)', async () => {
    const el = document.createElement('div') as TestElement;
    el.requestFullscreen = jest.fn().mockRejectedValue(new Error('denied'));
    await expect(requestFullscreen(el)).resolves.toBe(false);
  });
});

describe('exitFullscreen', () => {
  it('no-ops when the document is not fullscreen', async () => {
    const spy = jest.fn(() => Promise.resolve());
    testDoc().exitFullscreen = spy;
    await exitFullscreen();
    expect(spy).not.toHaveBeenCalled();
  });

  it('calls exit when an element is fullscreen', async () => {
    testDoc().webkitFullscreenElement = document.body;
    const spy = jest.fn(() => Promise.resolve());
    testDoc().exitFullscreen = spy;
    await exitFullscreen();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected exit', async () => {
    testDoc().webkitFullscreenElement = document.body;
    testDoc().exitFullscreen = jest.fn().mockRejectedValue(new Error('nope'));
    await expect(exitFullscreen()).resolves.toBeUndefined();
  });
});

describe('onFullscreenChange', () => {
  it('fires the handler on both standard and webkit events, and stops after unsubscribe', () => {
    const handler = jest.fn();
    const unsubscribe = onFullscreenChange(handler);

    document.dispatchEvent(new Event('fullscreenchange'));
    expect(handler).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('webkitfullscreenchange'));
    expect(handler).toHaveBeenCalledTimes(2);

    unsubscribe();
    document.dispatchEvent(new Event('fullscreenchange'));
    document.dispatchEvent(new Event('webkitfullscreenchange'));
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

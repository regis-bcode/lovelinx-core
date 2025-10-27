import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });

const { window } = dom;

globalThis.window = window as unknown as typeof globalThis.window;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLInputElement = window.HTMLInputElement;
globalThis.HTMLTextAreaElement = window.HTMLTextAreaElement;
globalThis.Event = window.Event;

const globalWithWindow = globalThis as typeof globalThis & typeof window;

Object.getOwnPropertyNames(window)
  .filter((property) => !(property in globalThis))
  .forEach((property) => {
    const key = property as keyof typeof window;
    globalWithWindow[key] = window[key as keyof typeof window];
  });

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => setTimeout(callback, 0);
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (handle: number) => clearTimeout(handle);
}

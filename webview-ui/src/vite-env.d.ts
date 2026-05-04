/// <reference types="vite/client" />

// VS Code webview API (only exists inside VS Code extension webview)
interface VsCodeApi {
  postMessage(message: unknown): void;
  getState<T = unknown>(): T | undefined;
  setState<T = unknown>(state: T): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

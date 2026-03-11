import type { Settings, WishlistItemDraft } from '../shared/models.js';

export type ContentButtonState =
  | 'idle-unadded'
  | 'idle-added'
  | 'loading-add'
  | 'loading-remove'
  | 'error'
  | 'disabled';

export interface ContentRuntimeState {
  currentUrl: string;
  currentAppId: string | null;
  currentDraft: WishlistItemDraft | null;
  settings: Settings | null;
  buttonState: ContentButtonState;
  observer: MutationObserver | null;
  scanTimer: number | null;
  retryAttempts: number;
  lastScanSignature: string | null;
  historyPatched: boolean;
}

export const runtimeState: ContentRuntimeState = {
  currentUrl: '',
  currentAppId: null,
  currentDraft: null,
  settings: null,
  buttonState: 'disabled',
  observer: null,
  scanTimer: null,
  retryAttempts: 0,
  lastScanSignature: null,
  historyPatched: false
};

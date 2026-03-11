import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { createLogger } from '../shared/logger.js';
import {
  addWishlistItem,
  getPageStatus,
  getSettings,
  removeWishlistItem
} from '../shared/messages.js';
import { STRINGS } from '../shared/ui-strings.js';
import {
  findSafeFallbackTarget,
  findInjectionTarget,
  getInjectedElements,
  isInjectedButtonTopmost,
  isInjectedButtonVisible,
  mountWishlistButton,
  removeInjectedButton,
  showToast,
  updateButtonState
} from './inject.js';
import { createDebouncedObserver } from './observer.js';
import { parseAppStorePage } from './parser.js';
import { runtimeState } from './state.js';

const logger = createLogger('inject');

function setDebugState(status: string, detail?: string) {
  document.documentElement.setAttribute('data-asw-status', status);

  if (detail) {
    document.documentElement.setAttribute('data-asw-detail', detail.slice(0, 200));
  } else {
    document.documentElement.removeAttribute('data-asw-detail');
  }
}

function scheduleScan(delayMs = 0) {
  if (runtimeState.scanTimer !== null) {
    window.clearTimeout(runtimeState.scanTimer);
  }

  runtimeState.scanTimer = window.setTimeout(() => {
    void scanPage();
    runtimeState.scanTimer = null;
  }, delayMs);
}

function notify(message: string, tone: 'success' | 'error' | 'info') {
  if (runtimeState.settings?.enableToast ?? true) {
    showToast(message, tone);
  }
}

function patchHistoryNavigation() {
  if (runtimeState.historyPatched) {
    return;
  }

  const methods: Array<'pushState' | 'replaceState'> = ['pushState', 'replaceState'];

  for (const method of methods) {
    const original = history[method];

    history[method] = function patchedHistoryState(
      this: History,
      ...args: Parameters<History[typeof method]>
    ) {
      const result = original.apply(this, args);
      scheduleScan(60);
      return result;
    };
  }

  runtimeState.historyPatched = true;
}

async function handleButtonClick() {
  const target = findInjectionTarget();
  const draft = runtimeState.currentDraft;
  const settings = runtimeState.settings ?? DEFAULT_SETTINGS;

  if (!target || !draft) {
    return;
  }

  const elements = mountWishlistButton(target, handleButtonClick);

  if (!draft.appId) {
    updateButtonState(elements, 'disabled', settings);
    notify(STRINGS.content.unsupported, 'error');
    return;
  }

  const allowRemove = settings.allowRemoveFromPageButton;

  try {
    if (runtimeState.buttonState === 'idle-added' && allowRemove) {
      runtimeState.buttonState = 'loading-remove';
      updateButtonState(elements, runtimeState.buttonState, settings);
      const response = await removeWishlistItem(draft.appId);

      if (!response.success) {
        runtimeState.buttonState = 'error';
        updateButtonState(elements, runtimeState.buttonState, settings);
        notify(response.message ?? STRINGS.content.errorToast, 'error');
        return;
      }

      runtimeState.buttonState = 'idle-unadded';
      updateButtonState(elements, runtimeState.buttonState, settings);
      notify(STRINGS.content.removedToast, 'success');
      return;
    }

    runtimeState.buttonState = 'loading-add';
    updateButtonState(elements, runtimeState.buttonState, settings);
    const response = await addWishlistItem(draft);

    if (response.success) {
      runtimeState.buttonState = 'idle-added';
      updateButtonState(elements, runtimeState.buttonState, settings);
      notify(STRINGS.content.addedToast, 'success');
      return;
    }

    if (response.errorCode === 'ERR_DUPLICATE_ITEM') {
      runtimeState.buttonState = 'idle-added';
      updateButtonState(elements, runtimeState.buttonState, settings);
      notify(STRINGS.content.duplicateToast, 'info');
      return;
    }

    runtimeState.buttonState = 'error';
    updateButtonState(elements, runtimeState.buttonState, settings);
    notify(response.message ?? STRINGS.content.errorToast, 'error');
  } catch (error) {
    logger.error('button action failed', error);
    runtimeState.buttonState = 'error';
    updateButtonState(elements, runtimeState.buttonState, settings);
    notify(STRINGS.content.errorToast, 'error');
  }
}

async function scanPage() {
  try {
    setDebugState('scanning');
    runtimeState.currentUrl = window.location.href;

    const parseResult = parseAppStorePage();
    if (!parseResult.isAppPage || !parseResult.draft) {
      setDebugState('not-app-page');
      runtimeState.currentAppId = null;
      runtimeState.currentDraft = null;
      runtimeState.lastScanSignature = null;
      runtimeState.retryAttempts = 0;
      runtimeState.buttonState = 'disabled';
      removeInjectedButton();
      return;
    }

    runtimeState.currentDraft = parseResult.draft;
    runtimeState.currentAppId = parseResult.draft.appId;
    const nextSignature = [
      window.location.href,
      parseResult.draft.appId ?? 'missing',
      parseResult.draft.name,
      parseResult.draft.iconUrl
    ].join('::');
    setDebugState(
      'parsed',
      `signals=${parseResult.signals.join(',')};appId=${parseResult.draft.appId ?? 'none'}`
    );

    const settings = runtimeState.settings ?? DEFAULT_SETTINGS;
    let elements = getInjectedElements();

    if (!elements || runtimeState.lastScanSignature !== nextSignature) {
      const target = findInjectionTarget();
      if (!target) {
        setDebugState('target-missing');
        if (runtimeState.retryAttempts < 6) {
          runtimeState.retryAttempts += 1;
          scheduleScan(400 * runtimeState.retryAttempts);
        }
        return;
      }

      runtimeState.retryAttempts = 0;
      elements = mountWishlistButton(target, handleButtonClick);
      runtimeState.lastScanSignature = nextSignature;
      setDebugState('button-mounted', target.strategy);
    }

    if (!isInjectedButtonVisible(elements.root) || !isInjectedButtonTopmost(elements.root)) {
      const fallbackTarget = findSafeFallbackTarget();
      if (fallbackTarget) {
        elements = mountWishlistButton(fallbackTarget, handleButtonClick);
        runtimeState.lastScanSignature = nextSignature;
        setDebugState('button-remounted', fallbackTarget.strategy);

        if (!isInjectedButtonTopmost(elements.root)) {
          setDebugState('button-covered', fallbackTarget.strategy);
        }
      }
    }

    if (!parseResult.draft.appId) {
      runtimeState.buttonState = 'disabled';
      updateButtonState(elements, runtimeState.buttonState, settings);
      setDebugState('disabled', 'missing-app-id');
      return;
    }

    const statusResponse = await getPageStatus(parseResult.draft.appId);
    if (!statusResponse.success) {
      runtimeState.buttonState = 'error';
      updateButtonState(elements, runtimeState.buttonState, settings);
      setDebugState(
        'status-error',
        statusResponse.message ?? statusResponse.errorCode ?? ''
      );
      return;
    }

    runtimeState.buttonState = statusResponse.data?.exists
      ? 'idle-added'
      : 'idle-unadded';

    updateButtonState(elements, runtimeState.buttonState, settings);
    setDebugState('ready', runtimeState.buttonState);
  } catch (error) {
    logger.error('scan failed', error);
    runtimeState.retryAttempts = 0;
    runtimeState.buttonState = 'error';
    removeInjectedButton();
    setDebugState(
      'scan-error',
      error instanceof Error ? error.message : 'unknown-error'
    );
  }
}

async function bootstrap() {
  setDebugState('booting');
  const settingsResponse = await getSettings();
  runtimeState.settings = settingsResponse.success && settingsResponse.data
    ? settingsResponse.data
    : DEFAULT_SETTINGS;
  setDebugState(
    'settings-loaded',
    settingsResponse.success ? 'ok' : settingsResponse.message ?? 'fallback-defaults'
  );

  await scanPage();

  if (!(runtimeState.settings?.enableAutoRescan ?? true)) {
    return;
  }

  const observerTargets = [
    document.body,
    document.querySelector('main'),
    document.querySelector('header')
  ];

  runtimeState.observer = createDebouncedObserver(observerTargets, () => {
    scheduleScan(150);
  });

  window.addEventListener('popstate', () => {
    scheduleScan(50);
  });

  window.addEventListener('pageshow', () => {
    scheduleScan(50);
  });

  window.addEventListener('hashchange', () => {
    scheduleScan(50);
  });

  patchHistoryNavigation();
}

void bootstrap().catch((error) => {
  logger.error('bootstrap failed', error);
  setDebugState(
    'bootstrap-error',
    error instanceof Error ? error.message : 'unknown-error'
  );
});

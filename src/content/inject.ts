import { TOAST_DURATION_MS, UI_CLASS_PREFIX } from '../shared/constants.js';
import { STRINGS } from '../shared/ui-strings.js';
import type { Settings } from '../shared/models.js';
import type { ContentButtonState } from './state.js';

const ROOT_ID = `${UI_CLASS_PREFIX}-wishlist-root`;
const TOAST_ID = `${UI_CLASS_PREFIX}-toast`;

export interface InjectionTarget {
  anchor: Element;
  strategy: 'after' | 'append' | 'prepend';
}

export interface InjectedElements {
  root: HTMLDivElement;
  button: HTMLButtonElement;
}

export function getInjectedElements(): InjectedElements | null {
  const root = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  const button = root?.querySelector('button') as HTMLButtonElement | null;

  if (!root || !button) {
    return null;
  }

  return { root, button };
}

function getButtonLabel(
  state: ContentButtonState,
  allowRemoveFromPageButton: boolean
) {
  switch (state) {
    case 'idle-added':
      return STRINGS.content.saved;
    case 'loading-add':
      return STRINGS.content.adding;
    case 'loading-remove':
      return STRINGS.content.removing;
    case 'error':
      return STRINGS.content.retry;
    case 'disabled':
      return STRINGS.content.unsupported;
    case 'idle-unadded':
    default:
      return STRINGS.content.add;
  }
}

function getIconMarkup(state: ContentButtonState) {
  if (state === 'idle-added') {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.2 4.8 14C2.3 11.8 2 8.1 4.1 5.7a4.9 4.9 0 0 1 7.4.3l.5.6.5-.6a4.9 4.9 0 0 1 7.4-.3c2.1 2.4 1.8 6.1-.7 8.3L12 20.2Z" fill="currentColor"></path>
        <path d="m9.6 12.4 1.6 1.7 3.5-4" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"></path>
      </svg>
    `;
  }

  if (state === 'error') {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2.8 20.2h18.4L12 3Z" fill="none" stroke="currentColor" stroke-width="1.8"></path>
        <path d="M12 9.4v4.7" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"></path>
        <circle cx="12" cy="17.2" r="1" fill="currentColor"></circle>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.2 4.8 14C2.3 11.8 2 8.1 4.1 5.7a4.9 4.9 0 0 1 7.4.3l.5.6.5-.6a4.9 4.9 0 0 1 7.4-.3c2.1 2.4 1.8 6.1-.7 8.3L12 20.2Z" fill="none" stroke="currentColor" stroke-width="1.8"></path>
    </svg>
  `;
}

function findElementByText(selectors: string, patterns: string[]) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selectors));
  return (
    elements.find((element) => {
      const text = element.textContent?.trim() ?? '';
      return patterns.some((pattern) => text.includes(pattern));
    }) ?? null
  );
}

function findTitleElement() {
  return document.querySelector('h1');
}

function isElementVisible(element: Element | null | undefined): boolean {
  if (!element) {
    return false;
  }

  let current: Element | null = element;
  while (current && current !== document.body) {
    const htmlElement = current as HTMLElement;
    const style = window.getComputedStyle(htmlElement);

    if (
      htmlElement.hidden ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      return false;
    }

    current = current.parentElement;
  }

  const rect = (element as HTMLElement).getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findActionGroup() {
  const title = findTitleElement();
  const headerRoot =
    title?.closest('header') ?? title?.closest('section') ?? title?.parentElement;

  if (!headerRoot) {
    return null;
  }

  const candidates = Array.from(headerRoot.querySelectorAll<HTMLElement>('div'));

  for (const element of candidates) {
    const interactiveChildren = Array.from(
      element.querySelectorAll<HTMLElement>('a, button, [role="button"]')
    ).filter((child) => isElementVisible(child));

    if (interactiveChildren.length >= 1 && isElementVisible(element)) {
      return element;
    }
  }

  return null;
}

function findMetaInfoElement(title: Element | null) {
  if (!title?.parentElement) {
    return null;
  }

  const siblings = Array.from(title.parentElement.children);
  const titleIndex = siblings.indexOf(title as HTMLElement);

  for (const sibling of siblings.slice(titleIndex + 1, titleIndex + 4)) {
    const text = sibling.textContent?.trim() ?? '';
    if (/(無料|入手|アプリ内課金|iPad対応|Mac|iPhone|¥|￥|\$)/u.test(text)) {
      return sibling;
    }
  }

  return null;
}

function findHeaderContainer(element: Element | null): Element | null {
  if (!element) {
    return null;
  }

  return (
    element.closest('header') ??
    element.closest('section') ??
    element.parentElement ??
    null
  );
}

export function findInjectionTarget(): InjectionTarget | null {
  const macStoreTrigger = findElementByText('a, button, [role="button"]', [
    'こちらで表示：Mac App Store',
    'View in Mac App Store',
    'Mac App Store'
  ]);

  if (macStoreTrigger) {
    return {
      anchor: macStoreTrigger,
      strategy: 'after'
    };
  }

  const actionGroup = findActionGroup();
  if (actionGroup) {
    return {
      anchor: actionGroup,
      strategy: 'append'
    };
  }

  const title = findTitleElement();
  const metaInfo = findMetaInfoElement(title);
  if (metaInfo) {
    return {
      anchor: metaInfo,
      strategy: 'after'
    };
  }

  if (title?.parentElement) {
    return {
      anchor: title,
      strategy: 'after'
    };
  }

  if (title) {
    return {
      anchor: title,
      strategy: 'after'
    };
  }

  const main = document.querySelector('main');
  if (main) {
    return {
      anchor: main,
      strategy: 'prepend'
    };
  }

  return null;
}

export function findSafeFallbackTarget(): InjectionTarget | null {
  const title = findTitleElement();
  const metaInfo = findMetaInfoElement(title);
  const headerContainer = findHeaderContainer(metaInfo ?? title);

  if (headerContainer && isElementVisible(headerContainer)) {
    return {
      anchor: headerContainer,
      strategy: 'after'
    };
  }

  if (metaInfo && isElementVisible(metaInfo)) {
    return {
      anchor: metaInfo,
      strategy: 'after'
    };
  }

  if (title && isElementVisible(title)) {
    return {
      anchor: title,
      strategy: 'after'
    };
  }

  const main = document.querySelector('main');
  if (main && isElementVisible(main)) {
    return {
      anchor: main,
      strategy: 'prepend'
    };
  }

  return null;
}

export function mountWishlistButton(
  target: InjectionTarget,
  onClick: () => void
): InjectedElements {
  let root = document.getElementById(ROOT_ID) as HTMLDivElement | null;

  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = `${UI_CLASS_PREFIX}-root`;
  }

  let button = root.querySelector('button') as HTMLButtonElement | null;
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = `${UI_CLASS_PREFIX}-button`;
    button.addEventListener('click', onClick);
    root.appendChild(button);
  }

  if (target.strategy === 'after') {
    target.anchor.insertAdjacentElement('afterend', root);
  } else if (target.strategy === 'prepend') {
    target.anchor.insertAdjacentElement('afterbegin', root);
  } else {
    target.anchor.appendChild(root);
  }

  return { root, button };
}

export function removeInjectedButton() {
  const root = document.getElementById(ROOT_ID);
  root?.remove();
}

export function updateButtonState(
  elements: InjectedElements,
  state: ContentButtonState,
  settings: Settings | null
) {
  const allowRemove = settings?.allowRemoveFromPageButton ?? false;
  const label = getButtonLabel(state, allowRemove);
  const isSaved = state === 'idle-added';
  const isLoading = state === 'loading-add' || state === 'loading-remove';
  const isDisabled = state === 'disabled' || (isSaved && !allowRemove);

  elements.root.dataset.state = state;
  elements.button.className = `${UI_CLASS_PREFIX}-button`;
  if (isSaved) {
    elements.button.classList.add(`${UI_CLASS_PREFIX}-button--saved`);
  }
  if (state === 'error') {
    elements.button.classList.add(`${UI_CLASS_PREFIX}-button--error`);
  }
  if (settings?.highlightSavedState && isSaved) {
    elements.root.classList.add(`${UI_CLASS_PREFIX}-root--highlighted`);
  } else {
    elements.root.classList.remove(`${UI_CLASS_PREFIX}-root--highlighted`);
  }

  elements.button.disabled = isDisabled || isLoading;
  elements.button.setAttribute('aria-live', 'polite');
  elements.button.setAttribute('aria-label', label);
  elements.button.title = label;
  elements.button.innerHTML = `
    <span class="${UI_CLASS_PREFIX}-button__icon">${getIconMarkup(state)}</span>
    <span class="${UI_CLASS_PREFIX}-button__label">${label}</span>
  `;
}

export function showToast(message: string, tone: 'success' | 'error' | 'info') {
  let toast = document.getElementById(TOAST_ID) as HTMLDivElement | null;

  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = `${UI_CLASS_PREFIX}-toast`;
    document.body.appendChild(toast);
  }

  toast.className = `${UI_CLASS_PREFIX}-toast ${UI_CLASS_PREFIX}-toast--${tone}`;
  toast.textContent = message;
  toast.dataset.visible = 'true';

  window.clearTimeout(Number(toast.dataset.timerId ?? '0'));
  const timerId = window.setTimeout(() => {
    if (toast) {
      toast.dataset.visible = 'false';
    }
  }, TOAST_DURATION_MS);

  toast.dataset.timerId = `${timerId}`;
}

export function isInjectedButtonVisible(root: HTMLElement | null): boolean {
  return isElementVisible(root);
}

export function isInjectedButtonTopmost(root: HTMLElement | null): boolean {
  if (!root || !isElementVisible(root)) {
    return false;
  }

  const rect = root.getBoundingClientRect();
  const probeX = Math.min(rect.left + 24, rect.right - 1);
  const probeY = Math.min(rect.top + rect.height / 2, rect.bottom - 1);
  const topElement = document.elementFromPoint(probeX, probeY);

  return Boolean(topElement && root.contains(topElement));
}

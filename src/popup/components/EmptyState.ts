import { STRINGS } from '../../shared/ui-strings.js';

interface EmptyStateOptions {
  icon?: string;
  title?: string;
  description?: string;
}

export function createEmptyState(options: EmptyStateOptions = {}): HTMLElement {
  const element = document.createElement('section');
  element.className = 'asw-empty';
  element.innerHTML = '';

  const icon = document.createElement('div');
  icon.className = 'asw-empty__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = options.icon ?? '♡';

  const title = document.createElement('h2');
  title.className = 'asw-empty__title';
  title.textContent = options.title ?? STRINGS.popup.emptyTitle;

  const description = document.createElement('p');
  description.className = 'asw-empty__description';
  description.textContent =
    options.description ?? STRINGS.popup.emptyDescription;

  element.append(icon, title, description);
  return element;
}

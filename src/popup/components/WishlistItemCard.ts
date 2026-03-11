import type { Settings, WishlistItem } from '../../shared/models.js';
import { formatDateTime } from '../../shared/date.js';
import { STRINGS } from '../../shared/ui-strings.js';

interface WishlistItemCardOptions {
  settings: Settings;
  onOpen: (item: WishlistItem) => void;
  onEdit: (item: WishlistItem) => void;
  onRemove: (item: WishlistItem) => void;
}

function createButton(
  label: string,
  className: string,
  ariaLabel: string,
  onClick: () => void
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.setAttribute('aria-label', ariaLabel);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

export function createWishlistItemCard(
  item: WishlistItem,
  options: WishlistItemCardOptions
): HTMLElement {
  const card = document.createElement('article');
  card.className = `asw-card asw-card--icon-${options.settings.iconSize}`;
  card.tabIndex = 0;
  card.setAttribute(
    'aria-label',
    `${item.name}、開発者 ${item.developer}、価格 ${item.priceText ?? '価格情報なし'}`
  );

  const media = document.createElement('div');
  media.className = 'asw-card__media';

  const icon = document.createElement('img');
  icon.className = 'asw-card__icon';
  icon.src = item.iconUrl;
  icon.alt = '';
  icon.loading = 'lazy';
  icon.addEventListener(
    'error',
    () => {
      icon.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#f5f5f7"/><path d="M20 25.5c0-6.4 5.2-11.5 11.5-11.5 3.6 0 6.8 1.7 8.9 4.4 2.1-2.7 5.3-4.4 8.9-4.4 6.3 0 11.5 5.1 11.5 11.5 0 11.2-13.1 18.8-20.4 24.5-.3.2-.7.2-1 0C33.1 44.3 20 36.7 20 25.5Z" fill="#0071e3" opacity=".18"/><path d="M31.5 18.5c3.4 0 6.3 1.9 8 4.7 1.6-2.8 4.6-4.7 8-4.7 5.1 0 9.3 4.1 9.3 9.2 0 8.6-10.3 14.7-17.3 20.1-7-5.4-17.3-11.5-17.3-20.1 0-5.1 4.2-9.2 9.3-9.2Z" fill="none" stroke="#0071e3" stroke-width="3" stroke-linejoin="round"/></svg>'
        );
      icon.classList.add('asw-card__icon--fallback');
    },
    { once: true }
  );
  media.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'asw-card__body';

  const header = document.createElement('div');
  header.className = 'asw-card__header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'asw-card__title-group';

  const title = document.createElement('h2');
  title.className = 'asw-card__title';
  title.textContent = item.name;

  const developer = document.createElement('p');
  developer.className = 'asw-card__developer';
  developer.textContent = item.developer;

  titleGroup.append(title, developer);

  const price = document.createElement('span');
  price.className = 'asw-card__price';
  price.textContent = item.priceText ?? '-';

  header.append(titleGroup, price);

  const metaParts: string[] = [];
  if (options.settings.showPrice && item.priceText) {
    metaParts.push(`価格 ${item.priceText}`);
  }
  if (options.settings.showCategory && item.category) {
    metaParts.push(item.category);
  }
  if (options.settings.showRating && item.ratingText) {
    metaParts.push(`評価 ${item.ratingText}`);
  }
  if (options.settings.showNoteIndicator && item.note) {
    metaParts.push('メモあり');
  }

  const meta = document.createElement('p');
  meta.className = 'asw-card__meta';
  meta.textContent = metaParts.join(' / ') || '補助情報はありません';

  const timestamp = document.createElement('p');
  timestamp.className = 'asw-card__timestamp';
  timestamp.textContent = `保存日時 ${formatDateTime(
    item.addedAt,
    options.settings.dateDisplayFormat
  )}`;

  body.append(header, meta, timestamp);

  if (item.note) {
    const note = document.createElement('p');
    note.className = 'asw-card__note';
    note.textContent = item.note;
    body.appendChild(note);
  }

  if (item.tags.length > 0) {
    const tags = document.createElement('div');
    tags.className = 'asw-card__tags';

    for (const tag of item.tags) {
      const element = document.createElement('span');
      element.className = 'asw-card__tag';
      element.textContent = `#${tag}`;
      tags.appendChild(element);
    }

    body.appendChild(tags);
  }

  const actions = document.createElement('div');
  actions.className = 'asw-card__actions';

  actions.append(
    createButton(
      STRINGS.popup.open,
      'asw-card__button asw-card__button--primary',
      `${item.name} を App Store で開く`,
      () => {
        options.onOpen(item);
      }
    ),
    createButton(
      STRINGS.popup.edit,
      'asw-card__button asw-card__button--subtle',
      `${item.name} のメモとタグを編集`,
      () => {
        options.onEdit(item);
      }
    ),
    createButton(
      STRINGS.popup.remove,
      'asw-card__button asw-card__button--danger',
      `${item.name} をウィッシュリストから削除`,
      () => {
        options.onRemove(item);
      }
    )
  );

  card.append(media, body, actions);

  card.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    options.onOpen(item);
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      options.onOpen(item);
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      options.onRemove(item);
      return;
    }

    if (event.key.toLowerCase() === 'e') {
      event.preventDefault();
      options.onEdit(item);
    }
  });

  return card;
}

import type { Settings, WishlistItem } from '../../shared/models.js';
import { STRINGS } from '../../shared/ui-strings.js';
import { createEmptyState } from './EmptyState.js';
import { createWishlistItemCard } from './WishlistItemCard.js';

interface WishlistListOptions {
  settings: Settings;
  hasStoredItems: boolean;
  query: string;
  onOpen: (item: WishlistItem) => void;
  onEdit: (item: WishlistItem) => void;
  onRemove: (item: WishlistItem) => void;
}

export function renderWishlistList(
  container: HTMLElement,
  items: WishlistItem[],
  options: WishlistListOptions
) {
  container.replaceChildren();

  if (items.length === 0) {
    if (options.hasStoredItems && options.query.trim().length > 0) {
      container.appendChild(
        createEmptyState({
          icon: '⌕',
          title: STRINGS.popup.noResultsTitle,
          description: STRINGS.popup.noResultsDescription
        })
      );
      return;
    }

    container.appendChild(createEmptyState());
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    fragment.appendChild(
      createWishlistItemCard(item, {
        settings: options.settings,
        onOpen: options.onOpen,
        onEdit: options.onEdit,
        onRemove: options.onRemove
      })
    );
  }

  container.appendChild(fragment);
}

import type { SortOption, WishlistItem } from './models.js';
import { normalizeSearchText } from './normalize.js';

function getPriceSortValue(priceText: string | null): number {
  if (!priceText) {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = priceText.replace(/,/gu, '').match(/(\d+(?:\.\d+)?)/u);
  if (normalized) {
    return Number.parseFloat(normalized[1]);
  }

  if (/無料|入手|free|get/iu.test(priceText)) {
    return 0;
  }

  return Number.POSITIVE_INFINITY;
}

export function searchItems(items: WishlistItem[], query: string): WishlistItem[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [...items];
  }

  return items.filter((item) => {
    const corpus = [
      item.name,
      item.developer,
      item.note,
      item.tags.join(' ')
    ]
      .map((value) => normalizeSearchText(value))
      .join(' ');

    return corpus.includes(normalizedQuery);
  });
}

export function sortItems(
  items: WishlistItem[],
  sortOption: SortOption
): WishlistItem[] {
  const sorted = [...items];

  sorted.sort((left, right) => {
    switch (sortOption) {
      case 'added_asc':
        return (
          Date.parse(left.addedAt) - Date.parse(right.addedAt) ||
          left.name.localeCompare(right.name, 'ja-JP')
        );
      case 'name_asc':
        return left.name.localeCompare(right.name, 'ja-JP');
      case 'rating_desc':
        return (right.ratingValue ?? -1) - (left.ratingValue ?? -1);
      case 'price_asc':
        return getPriceSortValue(left.priceText) - getPriceSortValue(right.priceText);
      case 'developer_asc':
        return left.developer.localeCompare(right.developer, 'ja-JP');
      case 'added_desc':
      default:
        return (
          Date.parse(right.addedAt) - Date.parse(left.addedAt) ||
          left.name.localeCompare(right.name, 'ja-JP')
        );
    }
  });

  return sorted;
}

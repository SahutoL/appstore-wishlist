import type {
  DateDisplayFormat,
  IconSize,
  Settings,
  SortOption
} from './models.js';

export const SCHEMA_VERSION = '1.0.2';
export const STORAGE_KEY = 'appStoreWishlistData';
export const EXTENSION_NAME = 'App Store Wishlist';
export const UI_CLASS_PREFIX = 'asw';
export const MAX_NOTE_LENGTH = 500;
export const MAX_TAG_LENGTH = 30;
export const MAX_TAG_COUNT = 10;
export const MAX_WISHLIST_ITEMS = 10000;
export const MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const TOAST_DURATION_MS = 2400;
export const HOST_PERMISSION_PATTERN = 'https://apps.apple.com/*';

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'added_desc', label: '新しい順' },
  { value: 'added_asc', label: '古い順' },
  { value: 'name_asc', label: '名前順' },
  { value: 'rating_desc', label: '評価順' },
  { value: 'price_asc', label: '価格順' },
  { value: 'developer_asc', label: '開発者順' }
];

export const ICON_SIZE_OPTIONS: Array<{ value: IconSize; label: string }> = [
  { value: 'small', label: '小さめ' },
  { value: 'medium', label: '標準' },
  { value: 'large', label: '大きめ' }
];

export const DATE_DISPLAY_OPTIONS: Array<{
  value: DateDisplayFormat;
  label: string;
}> = [
  { value: 'datetime', label: '日時' },
  { value: 'date', label: '日付のみ' },
  { value: 'relative', label: '相対表示' }
];

export const MVP_SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'added_desc', label: '新しい順' },
  { value: 'added_asc', label: '古い順' },
  { value: 'name_asc', label: '名前順' }
];

export const DEFAULT_SETTINGS: Settings = {
  version: SCHEMA_VERSION,
  defaultSort: 'added_desc',
  confirmBeforeDelete: true,
  enableToast: true,
  highlightSavedState: true,
  allowRemoveFromPageButton: true,
  enableAutoRescan: true,
  showCategory: true,
  showRating: true,
  showPrice: true,
  showNoteIndicator: true,
  iconSize: 'medium',
  dateDisplayFormat: 'datetime'
};

export const MESSAGE_TYPES = {
  GET_PAGE_STATUS: 'GET_PAGE_STATUS',
  ADD_WISHLIST_ITEM: 'ADD_WISHLIST_ITEM',
  REMOVE_WISHLIST_ITEM: 'REMOVE_WISHLIST_ITEM',
  GET_SETTINGS: 'GET_SETTINGS',
  PING: 'PING',
  GET_ALL_ITEMS: 'GET_ALL_ITEMS',
  SEARCH_ITEMS: 'SEARCH_ITEMS',
  REMOVE_ITEM: 'REMOVE_ITEM',
  OPEN_OPTIONS: 'OPEN_OPTIONS',
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA',
  CLEAR_ALL: 'CLEAR_ALL',
  GET_STATS: 'GET_STATS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_WISHLIST_ITEM: 'UPDATE_WISHLIST_ITEM'
} as const;

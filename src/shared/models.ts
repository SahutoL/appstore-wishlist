export type Platform = 'mac' | 'iphone' | 'ipad' | 'universal' | 'unknown';
export type IconSize = 'small' | 'medium' | 'large';
export type DateDisplayFormat = 'datetime' | 'date' | 'relative';

export type SortOption =
  | 'added_desc'
  | 'added_asc'
  | 'name_asc'
  | 'rating_desc'
  | 'price_asc'
  | 'developer_asc';

export type ErrorCode =
  | 'ERR_INVALID_APP_PAGE'
  | 'ERR_PARSE_FAILED'
  | 'ERR_MISSING_APP_ID'
  | 'ERR_DUPLICATE_ITEM'
  | 'ERR_STORAGE_READ_FAILED'
  | 'ERR_STORAGE_WRITE_FAILED'
  | 'ERR_INVALID_IMPORT_FORMAT'
  | 'ERR_UNKNOWN';

export interface WishlistItemDraft {
  appId: string | null;
  url: string;
  canonicalUrl: string | null;
  name: string;
  developer: string;
  iconUrl: string;
  screenshotUrl: string | null;
  priceText: string | null;
  ratingValue: number | null;
  ratingText: string | null;
  reviewCount: number | null;
  reviewCountText: string | null;
  category: string | null;
  platform: Platform | null;
  note?: string;
  tags?: string[];
  sourceLocale: string | null;
  rawSnapshot: Record<string, unknown> | null;
}

export interface WishlistItem {
  appId: string;
  url: string;
  canonicalUrl: string;
  name: string;
  developer: string;
  iconUrl: string;
  screenshotUrl: string | null;
  priceText: string | null;
  ratingValue: number | null;
  ratingText: string | null;
  reviewCount: number | null;
  reviewCountText: string | null;
  category: string | null;
  platform: Platform | null;
  note: string;
  tags: string[];
  addedAt: string;
  updatedAt: string;
  sourceLocale: string | null;
  isRemovedFromStore: boolean;
  rawSnapshot: Record<string, unknown> | null;
}

export interface Settings {
  version: string;
  defaultSort: SortOption;
  confirmBeforeDelete: boolean;
  enableToast: boolean;
  highlightSavedState: boolean;
  allowRemoveFromPageButton: boolean;
  enableAutoRescan: boolean;
  showCategory: boolean;
  showRating: boolean;
  showPrice: boolean;
  showNoteIndicator: boolean;
  iconSize: IconSize;
  dateDisplayFormat: DateDisplayFormat;
}

export interface WishlistItemMetadataPatch {
  note?: string;
  tags?: string[];
}

export interface StorageMeta {
  lastExportedAt: string | null;
  lastImportedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorageData {
  schemaVersion: string;
  wishlist: Record<string, WishlistItem>;
  settings: Settings;
  meta: StorageMeta;
}

export interface ExportPayload extends StorageData {
  exportedAt: string;
}

export interface ImportSummary {
  importedCount: number;
  overwrittenCount: number;
  skippedCount: number;
}

export interface StatsData {
  count: number;
  lastUpdatedAt: string | null;
  lastExportedAt: string | null;
  lastImportedAt: string | null;
}

export interface PageStatusData {
  exists: boolean;
  item: WishlistItem | null;
}

export interface ExtensionResponse<T> {
  success: boolean;
  data: T | null;
  errorCode: ErrorCode | null;
  message: string | null;
}

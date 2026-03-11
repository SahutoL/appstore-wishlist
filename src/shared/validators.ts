import { DEFAULT_SETTINGS, SCHEMA_VERSION } from './constants.js';
import {
  ensureIsoString,
  inferSourceLocaleFromUrl,
  normalizeNote,
  normalizeNullableText,
  normalizeTags,
  normalizeText,
  normalizeAppStoreUrl,
  repairLikelyBrokenAppleAssetUrl,
  normalizeUrl
} from './normalize.js';
import type {
  DateDisplayFormat,
  ExtensionResponse,
  IconSize,
  Settings,
  StorageData,
  WishlistItem,
  WishlistItemDraft
} from './models.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isLikelyImportPayload(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isRecord(value.wishlist);
}

export function isValidUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function coerceSettings(value: unknown): Settings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }

  const iconSize = typeof value.iconSize === 'string' ? value.iconSize : null;
  const dateDisplayFormat =
    typeof value.dateDisplayFormat === 'string' ? value.dateDisplayFormat : null;

  return {
    version:
      typeof value.version === 'string' ? value.version : DEFAULT_SETTINGS.version,
    defaultSort:
      typeof value.defaultSort === 'string'
        ? value.defaultSort
        : DEFAULT_SETTINGS.defaultSort,
    confirmBeforeDelete:
      typeof value.confirmBeforeDelete === 'boolean'
        ? value.confirmBeforeDelete
        : DEFAULT_SETTINGS.confirmBeforeDelete,
    enableToast:
      typeof value.enableToast === 'boolean'
        ? value.enableToast
        : DEFAULT_SETTINGS.enableToast,
    highlightSavedState:
      typeof value.highlightSavedState === 'boolean'
        ? value.highlightSavedState
        : DEFAULT_SETTINGS.highlightSavedState,
    allowRemoveFromPageButton:
      typeof value.allowRemoveFromPageButton === 'boolean'
        ? value.allowRemoveFromPageButton
        : DEFAULT_SETTINGS.allowRemoveFromPageButton,
    enableAutoRescan:
      typeof value.enableAutoRescan === 'boolean'
        ? value.enableAutoRescan
        : DEFAULT_SETTINGS.enableAutoRescan,
    showCategory:
      typeof value.showCategory === 'boolean'
        ? value.showCategory
        : DEFAULT_SETTINGS.showCategory,
    showRating:
      typeof value.showRating === 'boolean'
        ? value.showRating
        : DEFAULT_SETTINGS.showRating,
    showPrice:
      typeof value.showPrice === 'boolean'
        ? value.showPrice
        : DEFAULT_SETTINGS.showPrice,
    showNoteIndicator:
      typeof value.showNoteIndicator === 'boolean'
        ? value.showNoteIndicator
        : DEFAULT_SETTINGS.showNoteIndicator,
    iconSize:
      iconSize === 'small' || iconSize === 'medium' || iconSize === 'large'
        ? (iconSize as IconSize)
        : DEFAULT_SETTINGS.iconSize,
    dateDisplayFormat:
      dateDisplayFormat === 'datetime' ||
      dateDisplayFormat === 'date' ||
      dateDisplayFormat === 'relative'
        ? (dateDisplayFormat as DateDisplayFormat)
        : DEFAULT_SETTINGS.dateDisplayFormat
  };
}

export function validateWishlistDraft(
  draft: WishlistItemDraft,
  previousItem?: WishlistItem | null
): ExtensionResponse<WishlistItem> {
  const normalizedAppId = normalizeText(draft.appId);
  if (!/^\d+$/u.test(normalizedAppId)) {
    return {
      success: false,
      data: null,
      errorCode: 'ERR_MISSING_APP_ID',
      message: 'App ID を取得できませんでした。'
    };
  }

  const normalizedUrl = normalizeAppStoreUrl(draft.url);
  const normalizedCanonicalUrl =
    normalizeAppStoreUrl(draft.canonicalUrl) ?? normalizedUrl ?? '';
  const name = normalizeText(draft.name);
  const developer = normalizeText(draft.developer);
  const iconUrl = repairLikelyBrokenAppleAssetUrl(draft.iconUrl);

  if (!normalizedUrl || !iconUrl || !name || !developer) {
    return {
      success: false,
      data: null,
      errorCode: 'ERR_PARSE_FAILED',
      message: '保存に必要なアプリ情報を取得できませんでした。'
    };
  }

  const now = new Date().toISOString();
  const addedAt = previousItem?.addedAt ?? now;

  return {
    success: true,
    data: {
      appId: normalizedAppId,
      url: normalizedUrl,
      canonicalUrl: normalizedCanonicalUrl,
      name,
      developer,
      iconUrl,
      screenshotUrl: repairLikelyBrokenAppleAssetUrl(draft.screenshotUrl),
      priceText: normalizeNullableText(draft.priceText),
      ratingValue:
        typeof draft.ratingValue === 'number' && Number.isFinite(draft.ratingValue)
          ? draft.ratingValue
          : null,
      ratingText: normalizeNullableText(draft.ratingText),
      reviewCount:
        typeof draft.reviewCount === 'number' && Number.isFinite(draft.reviewCount)
          ? draft.reviewCount
          : null,
      reviewCountText: normalizeNullableText(draft.reviewCountText),
      category: normalizeNullableText(draft.category),
      platform: draft.platform ?? null,
      note: normalizeNote(draft.note ?? previousItem?.note),
      tags: normalizeTags(draft.tags ?? previousItem?.tags),
      addedAt,
      updatedAt: now,
      sourceLocale:
        normalizeNullableText(draft.sourceLocale) ??
        inferSourceLocaleFromUrl(normalizedCanonicalUrl),
      isRemovedFromStore: previousItem?.isRemovedFromStore ?? false,
      rawSnapshot: isRecord(draft.rawSnapshot) ? draft.rawSnapshot : null
    },
    errorCode: null,
    message: null
  };
}

export function coerceWishlistItem(value: unknown): WishlistItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const appId = normalizeText(typeof value.appId === 'string' ? value.appId : '');
  const name = normalizeText(typeof value.name === 'string' ? value.name : '');
  const developer = normalizeText(
    typeof value.developer === 'string' ? value.developer : ''
  );
  const url = normalizeAppStoreUrl(typeof value.url === 'string' ? value.url : '');
  const canonicalUrl = normalizeAppStoreUrl(
    typeof value.canonicalUrl === 'string' ? value.canonicalUrl : url
  );
  const iconUrl = repairLikelyBrokenAppleAssetUrl(
    typeof value.iconUrl === 'string' ? value.iconUrl : ''
  );

  if (!/^\d+$/u.test(appId) || !name || !developer || !url || !iconUrl) {
    return null;
  }

  return {
    appId,
    url,
    canonicalUrl: canonicalUrl ?? url,
    name,
    developer,
    iconUrl,
    screenshotUrl: repairLikelyBrokenAppleAssetUrl(
      typeof value.screenshotUrl === 'string' ? value.screenshotUrl : ''
    ),
    priceText: normalizeNullableText(
      typeof value.priceText === 'string' ? value.priceText : null
    ),
    ratingValue:
      typeof value.ratingValue === 'number' && Number.isFinite(value.ratingValue)
        ? value.ratingValue
        : null,
    ratingText: normalizeNullableText(
      typeof value.ratingText === 'string' ? value.ratingText : null
    ),
    reviewCount:
      typeof value.reviewCount === 'number' && Number.isFinite(value.reviewCount)
        ? value.reviewCount
        : null,
    reviewCountText: normalizeNullableText(
      typeof value.reviewCountText === 'string' ? value.reviewCountText : null
    ),
    category: normalizeNullableText(
      typeof value.category === 'string' ? value.category : null
    ),
    platform:
      typeof value.platform === 'string' ? value.platform : null,
    note: normalizeNote(value.note),
    tags: normalizeTags(value.tags),
    addedAt: ensureIsoString(
      typeof value.addedAt === 'string' ? value.addedAt : undefined
    ),
    updatedAt: ensureIsoString(
      typeof value.updatedAt === 'string' ? value.updatedAt : undefined
    ),
    sourceLocale: normalizeNullableText(
      typeof value.sourceLocale === 'string' ? value.sourceLocale : null
    ),
    isRemovedFromStore: Boolean(value.isRemovedFromStore),
    rawSnapshot: isRecord(value.rawSnapshot) ? value.rawSnapshot : null
  };
}

export function createDefaultStorageData(now = new Date().toISOString()): StorageData {
  return {
    schemaVersion: SCHEMA_VERSION,
    wishlist: {},
    settings: { ...DEFAULT_SETTINGS },
    meta: {
      lastExportedAt: null,
      lastImportedAt: null,
      createdAt: now,
      updatedAt: now
    }
  };
}

export function coerceStorageData(value: unknown): StorageData {
  const fallback = createDefaultStorageData();

  if (!isRecord(value)) {
    return fallback;
  }

  const wishlistSource = isRecord(value.wishlist) ? value.wishlist : {};
  const wishlist = Object.entries(wishlistSource).reduce<
    Record<string, WishlistItem>
  >((accumulator, [key, item]) => {
    const coerced = coerceWishlistItem(item);
    if (coerced) {
      accumulator[coerced.appId] = coerced;
    }
    return accumulator;
  }, {});

  const meta = isRecord(value.meta) ? value.meta : {};

  return {
    schemaVersion:
      typeof value.schemaVersion === 'string'
        ? value.schemaVersion
        : SCHEMA_VERSION,
    wishlist,
    settings: coerceSettings(value.settings),
    meta: {
      lastExportedAt:
        typeof meta.lastExportedAt === 'string' ? meta.lastExportedAt : null,
      lastImportedAt:
        typeof meta.lastImportedAt === 'string' ? meta.lastImportedAt : null,
      createdAt:
        typeof meta.createdAt === 'string'
          ? ensureIsoString(meta.createdAt)
          : fallback.meta.createdAt,
      updatedAt:
        typeof meta.updatedAt === 'string'
          ? ensureIsoString(meta.updatedAt)
          : fallback.meta.updatedAt
    }
  };
}

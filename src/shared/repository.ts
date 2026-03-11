import {
  MAX_WISHLIST_ITEMS,
  SCHEMA_VERSION
} from './constants.js';
import { createLogger } from './logger.js';
import { sortItems, searchItems } from './query.js';
import { readStorageData, writeStorageData } from './storage.js';
import type {
  ExportPayload,
  ImportSummary,
  Settings,
  StatsData,
  StorageData,
  WishlistItem,
  WishlistItemMetadataPatch,
  WishlistItemDraft
} from './models.js';
import {
  createDefaultStorageData,
  coerceStorageData,
  coerceWishlistItem,
  coerceSettings,
  isLikelyImportPayload,
  validateWishlistDraft
} from './validators.js';

const logger = createLogger('storage');

function updateMetaTimestamp(data: StorageData): StorageData {
  return {
    ...data,
    meta: {
      ...data.meta,
      updatedAt: new Date().toISOString()
    }
  };
}

function migrateStorageData(data: StorageData): StorageData {
  if (data.schemaVersion === SCHEMA_VERSION) {
    return data;
  }

  const enablePageRemoveByDefault = data.schemaVersion === '1.0.0';
  return {
      ...data,
      schemaVersion: SCHEMA_VERSION,
      settings: coerceSettings({
        ...data.settings,
        version: SCHEMA_VERSION,
        allowRemoveFromPageButton: enablePageRemoveByDefault
          ? true
          : data.settings.allowRemoveFromPageButton
      })
  };
}

async function getMutableData(): Promise<StorageData> {
  const data = await readStorageData();
  const migrated = migrateStorageData(data);

  if (migrated !== data) {
    await writeStorageData(updateMetaTimestamp(migrated));
    return migrated;
  }

  return data;
}

export async function initializeRepository(): Promise<StorageData> {
  const data = await readStorageData();
  const shouldInitialize =
    Object.keys(data.wishlist).length === 0 &&
    data.meta.createdAt === data.meta.updatedAt &&
    data.schemaVersion === SCHEMA_VERSION;

  if (shouldInitialize) {
    const initial = createDefaultStorageData();
    await writeStorageData(initial);
    return initial;
  }

  return data;
}

export async function getStorageData(): Promise<StorageData> {
  return getMutableData();
}

export async function getAllWishlistItems(): Promise<WishlistItem[]> {
  const data = await getMutableData();
  return Object.values(data.wishlist);
}

export async function getWishlistItem(appId: string): Promise<WishlistItem | null> {
  const data = await getMutableData();
  return data.wishlist[appId] ?? null;
}

export async function hasWishlistItem(appId: string): Promise<boolean> {
  const item = await getWishlistItem(appId);
  return item !== null;
}

export async function addWishlistItemToRepository(
  draft: WishlistItemDraft
): Promise<WishlistItem> {
  const data = await getMutableData();
  const existing = draft.appId ? data.wishlist[draft.appId] ?? null : null;

  if (existing) {
    const duplicateError = new Error('duplicate');
    duplicateError.name = 'ERR_DUPLICATE_ITEM';
    throw duplicateError;
  }

  if (Object.keys(data.wishlist).length >= MAX_WISHLIST_ITEMS) {
    const capacityError = new Error('wishlist limit reached');
    capacityError.name = 'ERR_STORAGE_WRITE_FAILED';
    throw capacityError;
  }

  const validationResult = validateWishlistDraft(draft);
  if (!validationResult.success || !validationResult.data) {
    const error = new Error(validationResult.message ?? 'validation failed');
    error.name = validationResult.errorCode ?? 'ERR_UNKNOWN';
    throw error;
  }

  const nextData: StorageData = updateMetaTimestamp({
    ...data,
    wishlist: {
      ...data.wishlist,
      [validationResult.data.appId]: validationResult.data
    }
  });

  await writeStorageData(nextData);
  return validationResult.data;
}

export async function removeWishlistItemFromRepository(
  appId: string
): Promise<boolean> {
  const data = await getMutableData();

  if (!data.wishlist[appId]) {
    return false;
  }

  const nextWishlist = { ...data.wishlist };
  delete nextWishlist[appId];

  await writeStorageData(
    updateMetaTimestamp({
      ...data,
      wishlist: nextWishlist
    })
  );

  return true;
}

export async function updateWishlistItemMetadataInRepository(
  appId: string,
  patch: WishlistItemMetadataPatch
): Promise<WishlistItem> {
  const data = await getMutableData();
  const existing = data.wishlist[appId] ?? null;

  if (!existing) {
    const error = new Error('item not found');
    error.name = 'ERR_UNKNOWN';
    throw error;
  }

  const validationResult = validateWishlistDraft(
    {
      ...existing,
      note: patch.note ?? existing.note,
      tags: patch.tags ?? existing.tags
    },
    existing
  );

  if (!validationResult.success || !validationResult.data) {
    const error = new Error(validationResult.message ?? 'validation failed');
    error.name = validationResult.errorCode ?? 'ERR_UNKNOWN';
    throw error;
  }

  const nextItem = validationResult.data;
  const nextData = updateMetaTimestamp({
    ...data,
    wishlist: {
      ...data.wishlist,
      [appId]: nextItem
    }
  });

  await writeStorageData(nextData);
  return nextItem;
}

export async function getRepositorySettings(): Promise<Settings> {
  const data = await getMutableData();
  return data.settings;
}

export async function updateRepositorySettings(
  patch: Partial<Settings>
) {
  const data = await getMutableData();
  const nextSettings = coerceSettings({
    ...data.settings,
    ...patch,
    version: SCHEMA_VERSION
  });

  const nextData = updateMetaTimestamp({
    ...data,
    settings: nextSettings
  });

  await writeStorageData(nextData);
  return nextSettings;
}

export async function searchRepositoryItems(
  query: string,
  sort: Settings['defaultSort']
): Promise<WishlistItem[]> {
  const items = await getAllWishlistItems();
  return sortItems(searchItems(items, query), sort);
}

export async function exportRepositoryData(): Promise<ExportPayload> {
  const data = await getMutableData();
  const exportedAt = new Date().toISOString();
  const nextData = {
    ...data,
    meta: {
      ...data.meta,
      lastExportedAt: exportedAt,
      updatedAt: exportedAt
    }
  };

  await writeStorageData(nextData);

  return {
    ...nextData,
    exportedAt
  };
}

export async function importRepositoryData(raw: unknown): Promise<ImportSummary> {
  if (!isLikelyImportPayload(raw)) {
    const error = new Error('invalid import payload');
    error.name = 'ERR_INVALID_IMPORT_FORMAT';
    throw error;
  }

  const importedData = coerceStorageData(raw);
  const currentData = await getMutableData();
  const nextWishlist = { ...currentData.wishlist };
  let importedCount = 0;
  let overwrittenCount = 0;
  let skippedCount = 0;

  for (const [appId, rawItem] of Object.entries(importedData.wishlist)) {
    const item = coerceWishlistItem(rawItem);
    if (!item) {
      skippedCount += 1;
      continue;
    }

    if (nextWishlist[appId]) {
      overwrittenCount += 1;
    } else {
      importedCount += 1;
    }

    nextWishlist[appId] = item;
  }

  const now = new Date().toISOString();
  await writeStorageData({
    ...currentData,
    schemaVersion: SCHEMA_VERSION,
    wishlist: nextWishlist,
    settings: coerceSettings({
      ...currentData.settings,
      ...importedData.settings,
      version: SCHEMA_VERSION
    }),
    meta: {
      ...currentData.meta,
      lastImportedAt: now,
      updatedAt: now
    }
  });

  return { importedCount, overwrittenCount, skippedCount };
}

export async function clearRepositoryData(): Promise<void> {
  const initial = createDefaultStorageData();
  await writeStorageData(initial);
}

export async function getRepositoryStats(): Promise<StatsData> {
  const data = await getMutableData();
  return {
    count: Object.keys(data.wishlist).length,
    lastUpdatedAt: data.meta.updatedAt,
    lastExportedAt: data.meta.lastExportedAt,
    lastImportedAt: data.meta.lastImportedAt
  };
}

export async function repairRepositoryData(): Promise<void> {
  try {
    const data = await readStorageData();
    await writeStorageData(migrateStorageData(coerceStorageData(data)));
  } catch (error) {
    logger.error('repair failed', error);
    await writeStorageData(createDefaultStorageData());
  }
}

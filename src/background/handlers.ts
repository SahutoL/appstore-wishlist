import { MESSAGE_TYPES } from '../shared/constants.js';
import { createLogger } from '../shared/logger.js';
import type { AppStoreWishlistMessage } from '../shared/messages.js';
import {
  createErrorResponse,
  createSuccessResponse
} from '../shared/messages.js';
import { sortItems } from '../shared/query.js';
import {
  addWishlistItemToRepository,
  clearRepositoryData,
  exportRepositoryData,
  getAllWishlistItems,
  getRepositorySettings,
  getRepositoryStats,
  getWishlistItem,
  importRepositoryData,
  removeWishlistItemFromRepository,
  searchRepositoryItems,
  updateWishlistItemMetadataInRepository,
  updateRepositorySettings
} from '../shared/repository.js';

const logger = createLogger('background');

function isMessageWithType(
  value: unknown
): value is AppStoreWishlistMessage & { type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

function getErrorCode(error: unknown) {
  if (error instanceof Error && error.name.startsWith('ERR_')) {
    return error.name;
  }

  return 'ERR_UNKNOWN';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function handleMessage(message: unknown) {
  try {
    if (!isMessageWithType(message)) {
      return createErrorResponse('ERR_UNKNOWN', 'メッセージ形式が不正です。');
    }

    switch (message.type) {
      case MESSAGE_TYPES.PING:
        return createSuccessResponse({ ok: true });
      case MESSAGE_TYPES.GET_PAGE_STATUS: {
        const appId = message.payload.appId;
        if (!appId) {
          return createSuccessResponse({
            exists: false,
            item: null
          });
        }

        const item = await getWishlistItem(appId);
        return createSuccessResponse({
          exists: item !== null,
          item
        });
      }
      case MESSAGE_TYPES.ADD_WISHLIST_ITEM: {
        const item = await addWishlistItemToRepository(message.payload);
        return createSuccessResponse(item);
      }
      case MESSAGE_TYPES.REMOVE_WISHLIST_ITEM:
      case MESSAGE_TYPES.REMOVE_ITEM: {
        const removed = await removeWishlistItemFromRepository(message.payload.appId);
        return createSuccessResponse({ removed });
      }
      case MESSAGE_TYPES.GET_SETTINGS:
        return createSuccessResponse(await getRepositorySettings());
      case MESSAGE_TYPES.GET_ALL_ITEMS: {
        const settings = await getRepositorySettings();
        const items = await getAllWishlistItems();
        return createSuccessResponse(sortItems(items, settings.defaultSort));
      }
      case MESSAGE_TYPES.SEARCH_ITEMS:
        return createSuccessResponse(
          await searchRepositoryItems(message.payload.query, message.payload.sort)
        );
      case MESSAGE_TYPES.OPEN_OPTIONS:
        return await new Promise((resolve) => {
          chrome.runtime.openOptionsPage(() => {
            if (chrome.runtime.lastError) {
              resolve(
                createErrorResponse(
                  'ERR_UNKNOWN',
                  chrome.runtime.lastError.message ?? '設定画面を開けませんでした。'
                )
              );
              return;
            }

            resolve(createSuccessResponse({ opened: true }));
          });
        });
      case MESSAGE_TYPES.EXPORT_DATA:
        return createSuccessResponse(await exportRepositoryData());
      case MESSAGE_TYPES.IMPORT_DATA:
        return createSuccessResponse(await importRepositoryData(message.payload.raw));
      case MESSAGE_TYPES.CLEAR_ALL:
        await clearRepositoryData();
        return createSuccessResponse({ cleared: true });
      case MESSAGE_TYPES.GET_STATS:
        return createSuccessResponse(await getRepositoryStats());
      case MESSAGE_TYPES.UPDATE_SETTINGS:
        return createSuccessResponse(
          await updateRepositorySettings(message.payload.patch)
        );
      case MESSAGE_TYPES.UPDATE_WISHLIST_ITEM:
        return createSuccessResponse(
          await updateWishlistItemMetadataInRepository(
            message.payload.appId,
            message.payload.patch
          )
        );
      default:
        return createErrorResponse('ERR_UNKNOWN', '未対応のメッセージです。');
    }
  } catch (error) {
    logger.error('message handler failed', message.type, error);

    const errorCode = getErrorCode(error);
    if (errorCode === 'ERR_DUPLICATE_ITEM') {
      return createErrorResponse(errorCode, 'すでに保存されています。');
    }

    if (errorCode === 'ERR_MISSING_APP_ID') {
      return createErrorResponse(errorCode, 'App ID を取得できませんでした。');
    }

    if (errorCode === 'ERR_PARSE_FAILED') {
      return createErrorResponse(
        errorCode,
        '保存に必要なアプリ情報を取得できませんでした。'
      );
    }

    if (errorCode === 'ERR_INVALID_IMPORT_FORMAT') {
      return createErrorResponse(errorCode, 'インポート形式が不正です。');
    }

    if (errorCode === 'ERR_STORAGE_READ_FAILED') {
      return createErrorResponse(errorCode, '保存データの読み込みに失敗しました。');
    }

    if (errorCode === 'ERR_STORAGE_WRITE_FAILED') {
      return createErrorResponse(errorCode, '保存データの更新に失敗しました。');
    }

    return createErrorResponse(
      errorCode,
      getErrorMessage(error, '処理中に不明なエラーが発生しました。')
    );
  }
}

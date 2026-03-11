import { MESSAGE_TYPES } from './constants.js';
import type {
  ExportPayload,
  ExtensionResponse,
  ImportSummary,
  PageStatusData,
  Settings,
  SortOption,
  StatsData,
  WishlistItem,
  WishlistItemMetadataPatch,
  WishlistItemDraft
} from './models.js';

export interface GetPageStatusMessage {
  type: typeof MESSAGE_TYPES.GET_PAGE_STATUS;
  payload: {
    appId: string | null;
  };
}

export interface AddWishlistItemMessage {
  type: typeof MESSAGE_TYPES.ADD_WISHLIST_ITEM;
  payload: WishlistItemDraft;
}

export interface RemoveWishlistItemMessage {
  type: typeof MESSAGE_TYPES.REMOVE_WISHLIST_ITEM;
  payload: {
    appId: string;
  };
}

export interface GetSettingsMessage {
  type: typeof MESSAGE_TYPES.GET_SETTINGS;
}

export interface PingMessage {
  type: typeof MESSAGE_TYPES.PING;
}

export interface GetAllItemsMessage {
  type: typeof MESSAGE_TYPES.GET_ALL_ITEMS;
}

export interface SearchItemsMessage {
  type: typeof MESSAGE_TYPES.SEARCH_ITEMS;
  payload: {
    query: string;
    sort: SortOption;
  };
}

export interface RemoveItemMessage {
  type: typeof MESSAGE_TYPES.REMOVE_ITEM;
  payload: {
    appId: string;
  };
}

export interface OpenOptionsMessage {
  type: typeof MESSAGE_TYPES.OPEN_OPTIONS;
}

export interface ExportDataMessage {
  type: typeof MESSAGE_TYPES.EXPORT_DATA;
}

export interface ImportDataMessage {
  type: typeof MESSAGE_TYPES.IMPORT_DATA;
  payload: {
    raw: unknown;
  };
}

export interface ClearAllMessage {
  type: typeof MESSAGE_TYPES.CLEAR_ALL;
}

export interface GetStatsMessage {
  type: typeof MESSAGE_TYPES.GET_STATS;
}

export interface UpdateSettingsMessage {
  type: typeof MESSAGE_TYPES.UPDATE_SETTINGS;
  payload: {
    patch: Partial<Settings>;
  };
}

export interface UpdateWishlistItemMessage {
  type: typeof MESSAGE_TYPES.UPDATE_WISHLIST_ITEM;
  payload: {
    appId: string;
    patch: WishlistItemMetadataPatch;
  };
}

export type AppStoreWishlistMessage =
  | GetPageStatusMessage
  | AddWishlistItemMessage
  | RemoveWishlistItemMessage
  | GetSettingsMessage
  | PingMessage
  | GetAllItemsMessage
  | SearchItemsMessage
  | RemoveItemMessage
  | OpenOptionsMessage
  | ExportDataMessage
  | ImportDataMessage
  | ClearAllMessage
  | GetStatsMessage
  | UpdateSettingsMessage
  | UpdateWishlistItemMessage;

export function createSuccessResponse<T>(data: T): ExtensionResponse<T> {
  return {
    success: true,
    data,
    errorCode: null,
    message: null
  };
}

export function createErrorResponse<T>(
  errorCode: ExtensionResponse<T>['errorCode'],
  message: string
): ExtensionResponse<T> {
  return {
    success: false,
    data: null,
    errorCode,
    message
  };
}

export function sendMessage<T>(
  message: AppStoreWishlistMessage
): Promise<ExtensionResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          data: null,
          errorCode: 'ERR_UNKNOWN',
          message: chrome.runtime.lastError.message ?? '通信に失敗しました。'
        });
        return;
      }

      resolve(
        (response as ExtensionResponse<T>) ?? {
          success: false,
          data: null,
          errorCode: 'ERR_UNKNOWN',
          message: 'レスポンスが不正です。'
        }
      );
    });
  });
}

export function getPageStatus(appId: string | null) {
  return sendMessage<PageStatusData>({
    type: MESSAGE_TYPES.GET_PAGE_STATUS,
    payload: { appId }
  });
}

export function addWishlistItem(payload: WishlistItemDraft) {
  return sendMessage<WishlistItem>({
    type: MESSAGE_TYPES.ADD_WISHLIST_ITEM,
    payload
  });
}

export function removeWishlistItem(appId: string) {
  return sendMessage<{ removed: boolean }>({
    type: MESSAGE_TYPES.REMOVE_WISHLIST_ITEM,
    payload: { appId }
  });
}

export function removeItem(appId: string) {
  return sendMessage<{ removed: boolean }>({
    type: MESSAGE_TYPES.REMOVE_ITEM,
    payload: { appId }
  });
}

export function getAllItems() {
  return sendMessage<WishlistItem[]>({
    type: MESSAGE_TYPES.GET_ALL_ITEMS
  });
}

export function searchStoredItems(query: string, sort: SortOption) {
  return sendMessage<WishlistItem[]>({
    type: MESSAGE_TYPES.SEARCH_ITEMS,
    payload: { query, sort }
  });
}

export function getSettings() {
  return sendMessage<Settings>({
    type: MESSAGE_TYPES.GET_SETTINGS
  });
}

export function updateSettings(patch: Partial<Settings>) {
  return sendMessage<Settings>({
    type: MESSAGE_TYPES.UPDATE_SETTINGS,
    payload: { patch }
  });
}

export function exportData() {
  return sendMessage<ExportPayload>({
    type: MESSAGE_TYPES.EXPORT_DATA
  });
}

export function importData(raw: unknown) {
  return sendMessage<ImportSummary>({
    type: MESSAGE_TYPES.IMPORT_DATA,
    payload: { raw }
  });
}

export function clearAllData() {
  return sendMessage<{ cleared: boolean }>({
    type: MESSAGE_TYPES.CLEAR_ALL
  });
}

export function getStats() {
  return sendMessage<StatsData>({
    type: MESSAGE_TYPES.GET_STATS
  });
}

export function openOptionsPage() {
  return sendMessage<{ opened: boolean }>({
    type: MESSAGE_TYPES.OPEN_OPTIONS
  });
}

export function updateWishlistItem(
  appId: string,
  patch: WishlistItemMetadataPatch
) {
  return sendMessage<WishlistItem>({
    type: MESSAGE_TYPES.UPDATE_WISHLIST_ITEM,
    payload: { appId, patch }
  });
}

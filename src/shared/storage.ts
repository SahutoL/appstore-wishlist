import { STORAGE_KEY } from './constants.js';
import type { StorageData } from './models.js';
import { coerceStorageData } from './validators.js';

function createNamedError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

export async function readStorageData(): Promise<StorageData> {
  return await new Promise((resolve, reject) => {
    chrome.storage.local.get(STORAGE_KEY, (items) => {
      if (chrome.runtime.lastError) {
        reject(
          createNamedError(
            'ERR_STORAGE_READ_FAILED',
            chrome.runtime.lastError.message ?? 'storage read failed'
          )
        );
        return;
      }

      resolve(coerceStorageData(items[STORAGE_KEY]));
    });
  });
}

export async function writeStorageData(data: StorageData): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
      if (chrome.runtime.lastError) {
        reject(
          createNamedError(
            'ERR_STORAGE_WRITE_FAILED',
            chrome.runtime.lastError.message ?? 'storage write failed'
          )
        );
        return;
      }

      resolve();
    });
  });
}

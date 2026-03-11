import { createLogger } from '../shared/logger.js';
import {
  initializeRepository,
  repairRepositoryData
} from '../shared/repository.js';
import { handleMessage } from './handlers.js';

const logger = createLogger('background');

chrome.runtime.onInstalled.addListener(() => {
  initializeRepository().catch((error) => {
    logger.error('initialization failed', error);
  });
});

repairRepositoryData().catch((error) => {
  logger.error('repository repair failed', error);
});

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    void handleMessage(message)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        logger.error('unhandled message failure', error);
        sendResponse({
          success: false,
          data: null,
          errorCode: 'ERR_UNKNOWN',
          message: 'バックグラウンド処理に失敗しました。'
        });
      });

    return true;
  }
);

import {
  DATE_DISPLAY_OPTIONS,
  HOST_PERMISSION_PATTERN,
  ICON_SIZE_OPTIONS,
  MAX_IMPORT_FILE_SIZE_BYTES,
  SCHEMA_VERSION,
  SORT_OPTIONS,
  STORAGE_KEY
} from '../shared/constants.js';
import { formatDateTime } from '../shared/date.js';
import { downloadJsonFile, readFileAsText } from '../shared/file.js';
import { createLogger } from '../shared/logger.js';
import type { Settings } from '../shared/models.js';
import { isLikelyImportPayload } from '../shared/validators.js';
import {
  clearAllData,
  exportData,
  getSettings,
  getStats,
  importData,
  updateSettings
} from '../shared/messages.js';
import { STRINGS } from '../shared/ui-strings.js';

const logger = createLogger('options');

const elements = {
  form: document.getElementById('settingsForm') as HTMLFormElement,
  statusMessage: document.getElementById('statusMessage') as HTMLElement,
  defaultSortSelect: document.getElementById('defaultSortSelect') as HTMLSelectElement,
  iconSizeSelect: document.getElementById('iconSizeSelect') as HTMLSelectElement,
  dateDisplayFormatSelect: document.getElementById('dateDisplayFormatSelect') as HTMLSelectElement,
  exportButton: document.getElementById('exportButton') as HTMLButtonElement,
  importInput: document.getElementById('importInput') as HTMLInputElement,
  clearButton: document.getElementById('clearButton') as HTMLButtonElement,
  statsCount: document.getElementById('statsCount') as HTMLElement,
  statsUpdatedAt: document.getElementById('statsUpdatedAt') as HTMLElement,
  statsExportedAt: document.getElementById('statsExportedAt') as HTMLElement,
  statsImportedAt: document.getElementById('statsImportedAt') as HTMLElement,
  schemaVersion: document.getElementById('schemaVersion') as HTMLElement,
  storageBackend: document.getElementById('storageBackend') as HTMLElement,
  storageKey: document.getElementById('storageKey') as HTMLElement,
  hostPattern: document.getElementById('hostPattern') as HTMLElement,
  extensionName: document.getElementById('extensionName') as HTMLElement,
  extensionVersion: document.getElementById('extensionVersion') as HTMLElement
};

function setStatus(message: string, tone: 'info' | 'error' = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.dataset.tone = tone;
}

function populateSortOptions() {
  const selectMaps = [
    { select: elements.defaultSortSelect, options: SORT_OPTIONS },
    { select: elements.iconSizeSelect, options: ICON_SIZE_OPTIONS },
    { select: elements.dateDisplayFormatSelect, options: DATE_DISPLAY_OPTIONS }
  ];

  for (const { select, options } of selectMaps) {
    select.replaceChildren();
    for (const option of options) {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      select.appendChild(element);
    }
  }
}

function populateSettingsForm(settings: Settings) {
  const formData: Array<[keyof Settings, boolean | string]> = [
    ['highlightSavedState', settings.highlightSavedState],
    ['enableToast', settings.enableToast],
    ['confirmBeforeDelete', settings.confirmBeforeDelete],
    ['allowRemoveFromPageButton', settings.allowRemoveFromPageButton],
    ['enableAutoRescan', settings.enableAutoRescan],
    ['showCategory', settings.showCategory],
    ['showRating', settings.showRating],
    ['showPrice', settings.showPrice],
    ['showNoteIndicator', settings.showNoteIndicator],
    ['defaultSort', settings.defaultSort],
    ['iconSize', settings.iconSize],
    ['dateDisplayFormat', settings.dateDisplayFormat]
  ];

  for (const [name, value] of formData) {
    const element = elements.form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
    if (!element) {
      continue;
    }

    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      element.checked = Boolean(value);
    } else {
      element.value = String(value);
    }
  }
}

function readSettingsFromForm(): Partial<Settings> {
  return {
    highlightSavedState: (
      elements.form.elements.namedItem('highlightSavedState') as HTMLInputElement
    ).checked,
    enableToast: (
      elements.form.elements.namedItem('enableToast') as HTMLInputElement
    ).checked,
    confirmBeforeDelete: (
      elements.form.elements.namedItem('confirmBeforeDelete') as HTMLInputElement
    ).checked,
    allowRemoveFromPageButton: (
      elements.form.elements.namedItem('allowRemoveFromPageButton') as HTMLInputElement
    ).checked,
    enableAutoRescan: (
      elements.form.elements.namedItem('enableAutoRescan') as HTMLInputElement
    ).checked,
    defaultSort: (
      elements.form.elements.namedItem('defaultSort') as HTMLSelectElement
    ).value as Settings['defaultSort'],
    showCategory: (
      elements.form.elements.namedItem('showCategory') as HTMLInputElement
    ).checked,
    showRating: (
      elements.form.elements.namedItem('showRating') as HTMLInputElement
    ).checked,
    showPrice: (
      elements.form.elements.namedItem('showPrice') as HTMLInputElement
    ).checked,
    showNoteIndicator: (
      elements.form.elements.namedItem('showNoteIndicator') as HTMLInputElement
    ).checked,
    iconSize: (
      elements.form.elements.namedItem('iconSize') as HTMLSelectElement
    ).value as Settings['iconSize'],
    dateDisplayFormat: (
      elements.form.elements.namedItem('dateDisplayFormat') as HTMLSelectElement
    ).value as Settings['dateDisplayFormat']
  };
}

async function refreshPageData() {
  const [settingsResponse, statsResponse] = await Promise.all([
    getSettings(),
    getStats()
  ]);

  if (settingsResponse.success && settingsResponse.data) {
    populateSettingsForm(settingsResponse.data);
  }

  if (statsResponse.success && statsResponse.data) {
    elements.statsCount.textContent = `${statsResponse.data.count} 件`;
    elements.statsUpdatedAt.textContent = formatDateTime(
      statsResponse.data.lastUpdatedAt
    );
    elements.statsExportedAt.textContent = formatDateTime(
      statsResponse.data.lastExportedAt
    );
    elements.statsImportedAt.textContent = formatDateTime(
      statsResponse.data.lastImportedAt
    );
  }

  if (!settingsResponse.success || !statsResponse.success) {
    setStatus('設定の読み込みに失敗しました。', 'error');
  }
}

async function handleFormSubmit(event: Event) {
  event.preventDefault();

  const response = await updateSettings(readSettingsFromForm());
  if (!response.success) {
    setStatus(STRINGS.options.saveFailure, 'error');
    return;
  }

  setStatus(STRINGS.options.saveSuccess);
  await refreshPageData();
}

async function handleExport() {
  const response = await exportData();
  if (!response.success || !response.data) {
    setStatus('書き出しに失敗しました。', 'error');
    return;
  }

  downloadJsonFile(
    `asw-wishlist-${new Date().toISOString().slice(0, 10)}.json`,
    response.data
  );
  setStatus('JSON を書き出しました。');
  await refreshPageData();
}

async function handleImport(file: File) {
  try {
    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      setStatus('ファイルサイズが大きすぎます。2MB 以下の JSON を選択してください。', 'error');
      return;
    }

    const text = await readFileAsText(file);
    const raw = JSON.parse(text) as unknown;
    if (!isLikelyImportPayload(raw)) {
      setStatus('ウィッシュリスト形式の JSON ではありません。', 'error');
      return;
    }

    const response = await importData(raw);

    if (!response.success || !response.data) {
      setStatus(response.message ?? STRINGS.options.importFailure, 'error');
      return;
    }

    setStatus(
      `${STRINGS.options.importSuccess}（新規 ${response.data.importedCount} / 上書き ${response.data.overwrittenCount} / スキップ ${response.data.skippedCount}）`
    );
    await refreshPageData();
  } catch (error) {
    logger.error('import failed', error);
    setStatus(STRINGS.options.importFailure, 'error');
  } finally {
    elements.importInput.value = '';
  }
}

async function handleClearAll() {
  if (!window.confirm(STRINGS.options.confirmDeleteAll)) {
    return;
  }

  const response = await clearAllData();
  if (!response.success) {
    setStatus('全件削除に失敗しました。', 'error');
    return;
  }

  setStatus('保存済みデータを削除しました。');
  await refreshPageData();
}

async function init() {
  populateSortOptions();

  const manifest = chrome.runtime.getManifest();
  elements.schemaVersion.textContent = SCHEMA_VERSION;
  elements.storageBackend.textContent = 'chrome.storage.local';
  elements.storageKey.textContent = STORAGE_KEY;
  elements.hostPattern.textContent = HOST_PERMISSION_PATTERN;
  elements.extensionName.textContent = manifest.name;
  elements.extensionVersion.textContent = manifest.version;

  elements.form.addEventListener('submit', (event) => {
    void handleFormSubmit(event);
  });

  elements.exportButton.addEventListener('click', () => {
    void handleExport();
  });

  elements.importInput.addEventListener('change', () => {
    const file = elements.importInput.files?.[0];
    if (file) {
      void handleImport(file);
    }
  });

  elements.clearButton.addEventListener('click', () => {
    void handleClearAll();
  });

  await refreshPageData();
}

void init().catch((error) => {
  logger.error('options init failed', error);
  setStatus('設定画面の初期化に失敗しました。', 'error');
});

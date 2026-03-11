import {
  DEFAULT_SETTINGS,
  SORT_OPTIONS,
  UI_CLASS_PREFIX
} from '../shared/constants.js';
import { downloadJsonFile } from '../shared/file.js';
import { createLogger } from '../shared/logger.js';
import type { Settings, SortOption, WishlistItem } from '../shared/models.js';
import { normalizeNote, normalizeTags } from '../shared/normalize.js';
import {
  exportData,
  getAllItems,
  getSettings,
  openOptionsPage,
  removeItem as removeStoredItem,
  updateWishlistItem
} from '../shared/messages.js';
import { searchItems, sortItems } from '../shared/query.js';
import { STRINGS } from '../shared/ui-strings.js';
import { updateHeaderCount } from './components/Header.js';
import { renderWishlistList } from './components/WishlistList.js';

interface PopupState {
  items: WishlistItem[];
  settings: Settings | null;
  query: string;
  sort: SortOption;
  errorMessage: string | null;
  editingItemId: string | null;
}

const logger = createLogger('popup');
const state: PopupState = {
  items: [],
  settings: null,
  query: '',
  sort: 'added_desc',
  errorMessage: null,
  editingItemId: null
};

const elements = {
  count: document.getElementById('count') as HTMLElement,
  subtitle: document.getElementById('subtitle') as HTMLElement,
  searchInput: document.getElementById('searchInput') as HTMLInputElement,
  sortSelect: document.getElementById('sortSelect') as HTMLSelectElement,
  resultsSummary: document.getElementById('resultsSummary') as HTMLElement,
  listContainer: document.getElementById('listContainer') as HTMLElement,
  errorBox: document.getElementById('errorBox') as HTMLElement,
  errorMessage: document.getElementById('errorMessage') as HTMLElement,
  reloadButton: document.getElementById('reloadButton') as HTMLButtonElement,
  exportButton: document.getElementById('exportButton') as HTMLButtonElement,
  optionsButton: document.getElementById('optionsButton') as HTMLButtonElement,
  editorDialog: document.getElementById('editorDialog') as HTMLDialogElement,
  editorForm: document.getElementById('editorForm') as HTMLFormElement,
  editorDialogTitle: document.getElementById('editorDialogTitle') as HTMLElement,
  editorNoteInput: document.getElementById('editorNoteInput') as HTMLTextAreaElement,
  editorTagsInput: document.getElementById('editorTagsInput') as HTMLInputElement,
  editorCloseButton: document.getElementById('editorCloseButton') as HTMLButtonElement,
  editorCancelButton: document.getElementById('editorCancelButton') as HTMLButtonElement,
  editorSaveButton: document.getElementById('editorSaveButton') as HTMLButtonElement
};

function renderSortOptions() {
  elements.sortSelect.replaceChildren();

  for (const option of SORT_OPTIONS) {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    elements.sortSelect.appendChild(element);
  }
}

function getVisibleItems() {
  return sortItems(searchItems(state.items, state.query), state.sort);
}

function renderError() {
  const hasError = Boolean(state.errorMessage);
  elements.errorBox.hidden = !hasError;
  elements.errorMessage.textContent = state.errorMessage ?? '';
}

function openItem(item: WishlistItem) {
  window.open(item.url, '_blank', 'noopener,noreferrer');
}

function getEditingItem() {
  if (!state.editingItemId) {
    return null;
  }

  return state.items.find((item) => item.appId === state.editingItemId) ?? null;
}

function closeEditor() {
  state.editingItemId = null;
  if (elements.editorDialog.open) {
    elements.editorDialog.close();
  }
}

function openEditor(item: WishlistItem) {
  state.editingItemId = item.appId;
  elements.editorDialogTitle.textContent = `${STRINGS.popup.editDialogTitle}: ${item.name}`;
  elements.editorNoteInput.value = item.note;
  elements.editorTagsInput.value = item.tags.join(', ');

  if (!elements.editorDialog.open) {
    elements.editorDialog.showModal();
  }
}

async function handleSaveEditor(event: Event) {
  event.preventDefault();

  const editingItem = getEditingItem();
  if (!editingItem) {
    closeEditor();
    return;
  }

  const note = normalizeNote(elements.editorNoteInput.value);
  const tags = normalizeTags(
    elements.editorTagsInput.value
      .split(/[,、\n]/u)
      .map((value) => value.trim())
      .filter(Boolean)
  );

  elements.editorSaveButton.disabled = true;

  try {
    const response = await updateWishlistItem(editingItem.appId, { note, tags });
    if (!response.success || !response.data) {
      state.errorMessage = response.message ?? STRINGS.popup.loadError;
      render();
      return;
    }

    state.items = state.items.map((item) =>
      item.appId === response.data?.appId ? response.data : item
    );
    state.errorMessage = null;
    closeEditor();
    render();
  } finally {
    elements.editorSaveButton.disabled = false;
  }
}

async function handleRemoveItem(item: WishlistItem) {
  if (
    state.settings?.confirmBeforeDelete !== false &&
    !window.confirm(STRINGS.options.confirmDeleteOne)
  ) {
    return;
  }

  const response = await removeStoredItem(item.appId);
  if (!response.success) {
    state.errorMessage = response.message ?? STRINGS.popup.loadError;
    render();
    return;
  }

  state.items = state.items.filter((entry) => entry.appId !== item.appId);
  state.errorMessage = null;
  render();
}

function render() {
  const visibleItems = getVisibleItems();
  renderError();
  updateHeaderCount(elements.count, elements.subtitle, state.items.length);
  elements.resultsSummary.textContent =
    state.query.trim().length > 0
      ? `${visibleItems.length} / ${state.items.length} 件を表示`
      : `${state.items.length} 件を表示`;
  renderWishlistList(elements.listContainer, visibleItems, {
    settings: state.settings ?? DEFAULT_SETTINGS,
    hasStoredItems: state.items.length > 0,
    query: state.query,
    onOpen: openItem,
    onEdit: (item) => {
      openEditor(item);
    },
    onRemove: (item) => {
      void handleRemoveItem(item);
    }
  });
}

async function loadPopupData() {
  let responses: [Awaited<ReturnType<typeof getSettings>>, Awaited<ReturnType<typeof getAllItems>>];

  try {
    responses = await Promise.all([getSettings(), getAllItems()]);
  } catch (error) {
    logger.error('popup load failed', error);
    state.errorMessage = STRINGS.popup.loadError;
    render();
    return;
  }

  const [settingsResponse, itemsResponse] = responses;

  if (!settingsResponse.success || !itemsResponse.success) {
    state.errorMessage =
      settingsResponse.message ??
      itemsResponse.message ??
      STRINGS.popup.loadError;
    render();
    return;
  }

  state.settings = settingsResponse.data;
  state.items = itemsResponse.data ?? [];
  state.sort = state.settings?.defaultSort ?? 'added_desc';
  elements.sortSelect.value = state.sort;
  state.errorMessage = null;
  render();
}

async function exportFromPopup() {
  const response = await exportData();
  if (!response.success || !response.data) {
    state.errorMessage = response.message ?? STRINGS.popup.loadError;
    render();
    return;
  }

  const filename = `${UI_CLASS_PREFIX}-wishlist-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  downloadJsonFile(filename, response.data);
}

async function init() {
  renderSortOptions();
  elements.searchInput.placeholder = STRINGS.popup.searchPlaceholder;
  elements.editorNoteInput.placeholder = STRINGS.popup.notePlaceholder;
  elements.editorTagsInput.placeholder = STRINGS.popup.tagsPlaceholder;
  elements.editorSaveButton.textContent = STRINGS.popup.save;
  elements.editorCancelButton.textContent = STRINGS.popup.cancel;

  elements.searchInput.addEventListener('input', () => {
    state.query = elements.searchInput.value.trim();
    render();
  });

  elements.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      elements.searchInput.value = '';
      state.query = '';
      elements.searchInput.blur();
      render();
    }
  });

  elements.sortSelect.addEventListener('change', () => {
    state.sort = elements.sortSelect.value as SortOption;
    render();
  });

  elements.reloadButton.addEventListener('click', () => {
    void loadPopupData();
  });

  elements.exportButton.addEventListener('click', () => {
    void exportFromPopup();
  });

  elements.optionsButton.addEventListener('click', () => {
    void openOptionsPage().then((response) => {
      if (!response.success) {
        state.errorMessage = response.message ?? STRINGS.popup.loadError;
        render();
      }
    });
  });

  elements.editorForm.addEventListener('submit', (event) => {
    void handleSaveEditor(event);
  });

  elements.editorCloseButton.addEventListener('click', () => {
    closeEditor();
  });

  elements.editorCancelButton.addEventListener('click', () => {
    closeEditor();
  });

  elements.editorDialog.addEventListener('close', () => {
    state.editingItemId = null;
  });

  await loadPopupData();
}

void init().catch((error) => {
  logger.error('popup init failed', error);
  state.errorMessage = STRINGS.popup.loadError;
  render();
});

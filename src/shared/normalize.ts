import {
  MAX_NOTE_LENGTH,
  MAX_TAG_COUNT,
  MAX_TAG_LENGTH
} from './constants.js';

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

export function normalizeText(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }

  return normalizeWhitespace(value.replace(/[\u0000-\u001F\u007F]/gu, ''));
}

export function normalizeNullableText(
  value: string | null | undefined
): string | null {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

export function parseAppIdFromString(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  const candidates = [
    /\/id(\d+)(?:[/?#]|$)/u,
    /\bid(\d+)\b/u,
    /\bapp-id=(\d+)\b/u,
    /\badam(?:Id|-id)["'=:\s]+(\d+)\b/iu
  ];

  for (const pattern of candidates) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, 'https://apps.apple.com/');
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
    }
    if (url.protocol !== 'https:') {
      return null;
    }
    url.hash = '';

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/u, '');
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function pickBestSrcsetUrl(
  value: string | null | undefined
): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const candidates = value
    .split(',')
    .map((entry, index) => {
      const [rawUrl, ...descriptors] = entry.trim().split(/\s+/u);
      const normalizedUrl = normalizeUrl(rawUrl);

      if (!normalizedUrl) {
        return null;
      }

      let width = 0;
      let density = 0;

      for (const descriptor of descriptors) {
        if (/^\d+w$/u.test(descriptor)) {
          width = Number.parseInt(descriptor.slice(0, -1), 10);
          continue;
        }

        if (/^\d+(?:\.\d+)?x$/u.test(descriptor)) {
          density = Number.parseFloat(descriptor.slice(0, -1));
        }
      }

      return {
        url: normalizedUrl,
        width,
        density,
        index
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((left, right) => {
      if (right.width !== left.width) {
        return right.width - left.width;
      }

      if (right.density !== left.density) {
        return right.density - left.density;
      }

      return left.index - right.index;
    });

  return candidates[0]?.url ?? null;
}

export function normalizeAppStoreUrl(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, 'https://apps.apple.com/');
    url.protocol = 'https:';
    url.hostname = 'apps.apple.com';
    url.search = '';
    url.hash = '';

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/u, '');
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function matchesAppStoreDetailUrl(
  value: string | null | undefined
): boolean {
  const normalized = normalizeAppStoreUrl(value);
  if (!normalized) {
    return false;
  }

  try {
    const url = new URL(normalized);
    const pathname = url.pathname.replace(/\/+$/u, '');
    return /^\/(?:[^/]+\/)?app(?:\/[^/]+)?\/id\d+$/u.test(pathname);
  } catch {
    return false;
  }
}

export function repairLikelyBrokenAppleAssetUrl(
  value: string | null | undefined
): string | null {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);

    if (
      url.hostname === 'apps.apple.com' &&
      /^\/image\/(thumb|upload|product)\//u.test(url.pathname)
    ) {
      url.hostname = 'is1-ssl.mzstatic.com';
      return url.toString();
    }

    return normalized;
  } catch {
    return normalized;
  }
}

export function normalizeSearchText(value: string | null | undefined): string {
  return normalizeText(value).toLocaleLowerCase('ja-JP');
}

export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueTags = new Set<string>();

  for (const item of value) {
    const normalized = normalizeText(typeof item === 'string' ? item : '');

    if (!normalized || normalized.length > MAX_TAG_LENGTH) {
      continue;
    }

    uniqueTags.add(normalized);

    if (uniqueTags.size >= MAX_TAG_COUNT) {
      break;
    }
  }

  return Array.from(uniqueTags);
}

export function normalizeNote(value: unknown): string {
  const normalized = normalizeText(typeof value === 'string' ? value : '');
  return normalized.slice(0, MAX_NOTE_LENGTH);
}

export function ensureIsoString(value?: string | null): string {
  if (value) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date().toISOString();
}

export function inferSourceLocaleFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const localeSegment = parsedUrl.pathname.split('/').filter(Boolean)[0] ?? '';
    return localeSegment.length > 0 ? localeSegment : null;
  } catch {
    return null;
  }
}

export function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/,/gu, '').match(/(\d+(?:\.\d+)?)/u);
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

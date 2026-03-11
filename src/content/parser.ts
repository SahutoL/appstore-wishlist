import type { Platform, WishlistItemDraft } from '../shared/models.js';
import {
  inferSourceLocaleFromUrl,
  matchesAppStoreDetailUrl,
  normalizeNullableText,
  normalizeNumber,
  normalizeText,
  normalizeAppStoreUrl,
  normalizeUrl,
  pickBestSrcsetUrl,
  parseAppIdFromString
} from '../shared/normalize.js';

interface ParseResult {
  isAppPage: boolean;
  signals: string[];
  draft: WishlistItemDraft | null;
}

const NAME_SELECTORS = ['h1', 'header h1', 'main h1'];
const DEVELOPER_SELECTORS = [
  'a[href*="/developer/"]',
  'main a[href*="/developer/"]',
  'header a[href*="/developer/"]'
];
const ICON_SELECTORS = [
  'header img',
  'main picture img',
  'main img[src*="image"]',
  'main img[src*="512x512"]',
  'main img[src*="296x0w"]'
];
const CATEGORY_SELECTORS = [
  'a[href*="/genre/"]',
  'nav a[href*="/genre/"]',
  'main a[href*="/genre/"]'
];

type ArtworkCandidateSource = 'picture' | 'img' | 'meta' | 'structured';

interface ArtworkCandidate {
  url: string;
  score: number;
  index: number;
}

export function isUsableArtworkUrl(value: string | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/^\/+/u, '/').toLocaleLowerCase('en-US');

    if (pathname.startsWith('/assets/')) {
      return false;
    }

    if (pathname.includes('/assets/images/share/')) {
      return false;
    }

    if (pathname.endsWith('/app-store.png')) {
      return false;
    }

    if (pathname.endsWith('/apple-touch-icon.png')) {
      return false;
    }

    if (pathname.endsWith('/1x1.gif')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function scoreArtworkUrl(
  value: string | null,
  source: ArtworkCandidateSource
): number {
  if (!isUsableArtworkUrl(value)) {
    return Number.NEGATIVE_INFINITY;
  }

  const url = new URL(value as string);
  const hostname = url.hostname.toLocaleLowerCase('en-US');
  const pathname = url.pathname.toLocaleLowerCase('en-US');
  let score = 0;

  if (hostname.endsWith('mzstatic.com')) {
    score += 60;
  }

  if (pathname.includes('/image/thumb/')) {
    score += 30;
  }

  if (pathname.includes('/image/upload/') || pathname.includes('/image/product/')) {
    score += 18;
  }

  if (/(appicon|icon[-_]|marketing|software|artwork)/iu.test(pathname)) {
    score += 18;
  }

  const sizeMatch = pathname.match(/\/(\d{2,4})x(\d{2,4})/u);
  if (sizeMatch) {
    score += Math.min(Number.parseInt(sizeMatch[1], 10), 512) / 16;
  }

  if (source === 'picture') {
    score += 12;
  } else if (source === 'img') {
    score += 8;
  } else if (source === 'meta') {
    score += 4;
  } else {
    score += 2;
  }

  if (hostname === 'apps.apple.com') {
    score -= 20;
  }

  return score;
}

export function chooseBestArtworkUrl(
  candidates: Array<{ url: string | null; source: ArtworkCandidateSource }>
): string | null {
  const ranked = candidates
    .map<ArtworkCandidate | null>((candidate, index) => {
      const normalizedUrl = normalizeUrl(candidate.url);
      const score = scoreArtworkUrl(normalizedUrl, candidate.source);

      if (!Number.isFinite(score) || !normalizedUrl) {
        return null;
      }

      return {
        url: normalizedUrl,
        score,
        index
      };
    })
    .filter((candidate): candidate is ArtworkCandidate => candidate !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    });

  return ranked[0]?.url ?? null;
}

function queryFirstElement<T extends Element>(
  root: ParentNode,
  selectors: string[]
): T | null {
  for (const selector of selectors) {
    const element = root.querySelector<T>(selector);
    if (element) {
      return element;
    }
  }

  return null;
}

function queryFirstText(root: ParentNode, selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    const text = normalizeNullableText(element?.textContent);
    if (text) {
      return text;
    }
  }

  return null;
}

function getMetaContent(name: string, attribute: 'name' | 'property' = 'name') {
  const selector = `meta[${attribute}="${name}"]`;
  const element = document.head.querySelector<HTMLMetaElement>(selector);
  return normalizeNullableText(element?.content);
}

function getCanonicalUrl() {
  const link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  return normalizeAppStoreUrl(link?.href ?? window.location.href);
}

function getMetaCandidates(): string[] {
  const selectors: Array<[string, 'content' | 'href']> = [
    ['meta[name="apple-itunes-app"]', 'content'],
    ['meta[property="al:ios:url"]', 'content'],
    ['meta[property="al:ipad:url"]', 'content'],
    ['meta[property="al:iphone:url"]', 'content'],
    ['meta[property="og:url"]', 'content'],
    ['link[rel="alternate"]', 'href']
  ];

  return selectors
    .map(([selector, attribute]) => {
      const element = document.head.querySelector(selector);
      if (!element) {
        return null;
      }

      const raw = element.getAttribute(attribute);
      return normalizeNullableText(raw);
    })
    .filter((value): value is string => Boolean(value));
}

function getStructuredDataObjects(): Record<string, unknown>[] {
  const scripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
  );

  const entries: Record<string, unknown>[] = [];

  for (const script of scripts) {
    if (!script.textContent) {
      continue;
    }

    try {
      const parsed = JSON.parse(script.textContent) as unknown;

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') {
            entries.push(item as Record<string, unknown>);
          }
        }
        continue;
      }

      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record['@graph'])) {
          for (const graphItem of record['@graph']) {
            if (graphItem && typeof graphItem === 'object') {
              entries.push(graphItem as Record<string, unknown>);
            }
          }
        }
        entries.push(record);
      }
    } catch {
      continue;
    }
  }

  return entries;
}

function getSoftwareObject(structuredDataObjects: Record<string, unknown>[]) {
  return (
    structuredDataObjects.find((entry) => {
      const type = entry['@type'];

      if (Array.isArray(type)) {
        return type.some(
          (item) => typeof item === 'string' && item.includes('SoftwareApplication')
        );
      }

      return typeof type === 'string' && type.includes('SoftwareApplication');
    }) ?? null
  );
}

function findHeaderRoot(titleElement: Element | null): ParentNode {
  if (!titleElement) {
    return document;
  }

  return (
    titleElement.closest('header') ??
    titleElement.closest('section') ??
    titleElement.parentElement ??
    document
  );
}

function getName(softwareObject: Record<string, unknown> | null): string | null {
  const domName = queryFirstText(document, NAME_SELECTORS);
  if (domName) {
    return domName;
  }

  const titleMeta = getMetaContent('title');
  if (titleMeta) {
    return titleMeta
      .replace(/\s+on the App Store.*$/iu, '')
      .replace(/\s+-+\s+Apple.*$/iu, '')
      .trim();
  }

  const documentTitle = normalizeNullableText(document.title);
  if (documentTitle) {
    return documentTitle
      .replace(/\s+on the App Store.*$/iu, '')
      .replace(/\s+-+\s+Apple.*$/iu, '')
      .trim();
  }

  const ogTitle = getMetaContent('og:title', 'property');
  if (ogTitle) {
    return ogTitle.replace(/\s+on the App Store.*$/iu, '').trim();
  }

  if (softwareObject && typeof softwareObject.name === 'string') {
    return normalizeNullableText(softwareObject.name);
  }

  return null;
}

function getDeveloper(
  softwareObject: Record<string, unknown> | null,
  headerRoot: ParentNode
): string | null {
  const domDeveloper = queryFirstText(headerRoot, DEVELOPER_SELECTORS);
  if (domDeveloper && !/App Store/iu.test(domDeveloper)) {
    return domDeveloper;
  }

  const author = softwareObject?.author;
  if (author && typeof author === 'object' && author !== null) {
    const authorName = (author as Record<string, unknown>).name;
    if (typeof authorName === 'string') {
      return normalizeNullableText(authorName);
    }
  }

  if (typeof softwareObject?.publisher === 'string') {
    return normalizeNullableText(softwareObject.publisher);
  }

  return null;
}

function extractImageCandidates(root: ParentNode): string[] {
  const candidates: Array<{ url: string | null; source: ArtworkCandidateSource }> = [];

  const pictureSources = root.querySelectorAll<HTMLSourceElement>('picture source[srcset]');
  for (const source of pictureSources) {
    candidates.push({
      url: pickBestSrcsetUrl(source.srcset),
      source: 'picture'
    });
  }

  for (const selector of ICON_SELECTORS) {
    const elements = root.querySelectorAll<HTMLImageElement>(selector);
    for (const element of elements) {
      candidates.push({
        url: normalizeUrl(element.currentSrc || element.src),
        source: 'img'
      });
    }
  }

  const best = chooseBestArtworkUrl(candidates);
  return best ? [best] : [];
}

function getIconUrl(
  softwareObject: Record<string, unknown> | null,
  headerRoot: ParentNode
): string | null {
  const domIcon = extractImageCandidates(headerRoot)[0] ?? null;
  const ogImage = normalizeUrl(getMetaContent('og:image', 'property'));

  const structuredImages = Array.isArray(softwareObject?.image)
    ? softwareObject.image
        .filter((item): item is string => typeof item === 'string')
        .map((item) => ({
          url: normalizeUrl(item),
          source: 'structured' as const
        }))
    : typeof softwareObject?.image === 'string'
      ? [
          {
            url: normalizeUrl(softwareObject.image),
            source: 'structured' as const
          }
        ]
      : [];

  return chooseBestArtworkUrl([
    { url: domIcon, source: 'img' },
    { url: ogImage, source: 'meta' },
    ...structuredImages
  ]);
}

function getScreenshotUrl(
  softwareObject: Record<string, unknown> | null,
  iconUrl: string | null
): string | null {
  const screenshotElement = document.querySelector<HTMLImageElement>(
    'main img[src*="screen"], main img[src*="screenshot"]'
  );
  const screenshotFromDom = normalizeUrl(
    screenshotElement?.currentSrc || screenshotElement?.src
  );
  if (screenshotFromDom && screenshotFromDom !== iconUrl) {
    return screenshotFromDom;
  }

  const image = softwareObject?.image;
  if (Array.isArray(image)) {
    const candidate = image.find(
      (value) => typeof value === 'string' && normalizeUrl(value) !== iconUrl
    );
    return normalizeUrl(typeof candidate === 'string' ? candidate : null);
  }

  return null;
}

function getPriceText(
  softwareObject: Record<string, unknown> | null,
  headerRoot: ParentNode
): string | null {
  const clickableElements = Array.from(
    headerRoot.querySelectorAll<HTMLElement>('a, button, [role="button"]')
  );

  for (const element of clickableElements) {
    const text = normalizeNullableText(element.textContent);
    if (text && /(無料|入手|¥|￥|\$|€|£)/u.test(text) && text.length <= 24) {
      return text;
    }
  }

  const offers = softwareObject?.offers;
  if (offers && typeof offers === 'object' && offers !== null) {
    const offerRecord = offers as Record<string, unknown>;
    if (typeof offerRecord.price === 'string') {
      const currency =
        typeof offerRecord.priceCurrency === 'string'
          ? `${offerRecord.priceCurrency} `
          : '';
      return normalizeNullableText(`${currency}${offerRecord.price}`);
    }
  }

  return null;
}

function getRatingData(softwareObject: Record<string, unknown> | null) {
  const aggregateRating =
    softwareObject && typeof softwareObject.aggregateRating === 'object'
      ? (softwareObject.aggregateRating as Record<string, unknown>)
      : null;

  if (aggregateRating) {
    const ratingValue = normalizeNumber(aggregateRating.ratingValue);
    const reviewCount =
      normalizeNumber(aggregateRating.reviewCount) ??
      normalizeNumber(aggregateRating.ratingCount);

    return {
      ratingValue,
      ratingText: ratingValue ? `${ratingValue.toFixed(1)}` : null,
      reviewCount,
      reviewCountText: reviewCount ? `${reviewCount}` : null
    };
  }

  const ariaCandidate = Array.from(document.querySelectorAll<HTMLElement>('[aria-label]'))
    .map((element) => element.getAttribute('aria-label'))
    .find((label) => {
      return Boolean(label && /(\d+(?:\.\d+)?).*(評価|ratings?|reviews?)/iu.test(label));
    });

  if (!ariaCandidate) {
    return {
      ratingValue: null,
      ratingText: null,
      reviewCount: null,
      reviewCountText: null
    };
  }

  const ratingMatch = ariaCandidate.match(/(\d+(?:\.\d+)?)/u);
  const reviewMatch = ariaCandidate.match(/(\d[\d,]*)\s*(件|ratings?|reviews?)/iu);

  return {
    ratingValue: ratingMatch ? Number.parseFloat(ratingMatch[1]) : null,
    ratingText: ratingMatch?.[1] ?? null,
    reviewCount: reviewMatch
      ? Number.parseInt(reviewMatch[1].replace(/,/gu, ''), 10)
      : null,
    reviewCountText: reviewMatch?.[1] ?? null
  };
}

function getCategory(softwareObject: Record<string, unknown> | null) {
  const domCategory = queryFirstText(document, CATEGORY_SELECTORS);
  if (domCategory) {
    return domCategory;
  }

  if (typeof softwareObject?.applicationCategory === 'string') {
    return normalizeNullableText(softwareObject.applicationCategory);
  }

  return null;
}

function getPlatform(): Platform {
  const url = window.location.href;

  if (/\/iphone\//iu.test(url)) {
    return 'iphone';
  }

  if (/\/ipad\//iu.test(url)) {
    return 'ipad';
  }

  if (/\/mac-app-store\//iu.test(url)) {
    return 'mac';
  }

  const pageText = normalizeText(document.body.textContent ?? '');

  if (/Mac App Store|macOS|Mac /iu.test(pageText)) {
    return 'mac';
  }

  const hasIphone = /iPhone/iu.test(pageText);
  const hasIpad = /iPad/iu.test(pageText);

  if (hasIphone && hasIpad) {
    return 'universal';
  }
  if (hasIphone) {
    return 'iphone';
  }
  if (hasIpad) {
    return 'ipad';
  }

  return 'unknown';
}

function getStructuredDataAppIdCandidates(
  softwareObject: Record<string, unknown> | null
): string[] {
  if (!softwareObject) {
    return [];
  }

  const candidates: string[] = [];
  const directKeys = ['url', '@id', 'identifier', 'id'];

  for (const key of directKeys) {
    const value = softwareObject[key];
    if (typeof value === 'string') {
      candidates.push(value);
    }
  }

  const offers = softwareObject.offers;
  if (offers && typeof offers === 'object' && !Array.isArray(offers)) {
    for (const value of Object.values(offers)) {
      if (typeof value === 'string') {
        candidates.push(value);
      }
    }
  }

  return candidates;
}

function getDataAttributeAppId(): string | null {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-app-id], [data-adam-id], [data-item-id]')
  );

  for (const element of elements) {
    const candidates = [
      element.dataset.appId,
      element.dataset.adamId,
      element.dataset.itemId
    ];

    for (const candidate of candidates) {
      const appId = parseAppIdFromString(candidate) ?? normalizeNullableText(candidate);
      if (appId && /^\d+$/u.test(appId)) {
        return appId;
      }
    }
  }

  return null;
}

function getAppId(softwareObject: Record<string, unknown> | null): string | null {
  const sources = [
    window.location.href,
    getCanonicalUrl(),
    ...getMetaCandidates(),
    ...getStructuredDataAppIdCandidates(softwareObject)
  ];

  for (const source of sources) {
    const appId = parseAppIdFromString(source);
    if (appId) {
      return appId;
    }
  }

  const internalLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .map((anchor) => anchor.href)
    .find((href) => /\/id\d+/u.test(href));

  return parseAppIdFromString(internalLink) ?? getDataAttributeAppId();
}

export function parseAppStorePage(): ParseResult {
  const structuredDataObjects = getStructuredDataObjects();
  const softwareObject = getSoftwareObject(structuredDataObjects);
  const titleElement = queryFirstElement(document, NAME_SELECTORS);
  const headerRoot = findHeaderRoot(titleElement);
  const canonicalUrl = getCanonicalUrl();
  const hasDetailUrl =
    matchesAppStoreDetailUrl(window.location.href) ||
    matchesAppStoreDetailUrl(canonicalUrl);
  const appId = getAppId(softwareObject);
  const name = getName(softwareObject);
  const developer = getDeveloper(softwareObject, headerRoot);
  const iconUrl = getIconUrl(softwareObject, headerRoot);
  const signals = new Set<string>();

  if (hasDetailUrl) {
    signals.add('url');
  }
  if (name) {
    signals.add('name');
  }
  if (iconUrl) {
    signals.add('icon');
  }
  if (appId) {
    signals.add('appId');
  }
  if (softwareObject) {
    signals.add('structuredData');
  }

  if (!hasDetailUrl || signals.size < 2) {
    return {
      isAppPage: false,
      signals: Array.from(signals),
      draft: null
    };
  }

  const ratingData = getRatingData(softwareObject);
  const draft: WishlistItemDraft = {
    appId,
    url: normalizeAppStoreUrl(window.location.href) ?? window.location.href,
    canonicalUrl,
    name: name ?? '',
    developer: developer ?? '',
    iconUrl: iconUrl ?? '',
    screenshotUrl: getScreenshotUrl(softwareObject, iconUrl),
    priceText: getPriceText(softwareObject, headerRoot),
    ratingValue: ratingData.ratingValue,
    ratingText: ratingData.ratingText,
    reviewCount: ratingData.reviewCount,
    reviewCountText: ratingData.reviewCountText,
    category: getCategory(softwareObject),
    platform: getPlatform(),
    note: '',
    tags: [],
    sourceLocale: inferSourceLocaleFromUrl(canonicalUrl),
    rawSnapshot: {
      signals: Array.from(signals),
      canonicalUrl,
      originalIconUrl: iconUrl,
      structuredDataName:
        typeof softwareObject?.name === 'string' ? softwareObject.name : null
    }
  };

  return {
    isAppPage: true,
    signals: Array.from(signals),
    draft
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAppStoreUrl,
  matchesAppStoreDetailUrl,
  normalizeUrl,
  pickBestSrcsetUrl,
  repairLikelyBrokenAppleAssetUrl,
  parseAppIdFromString
} from '../dist/shared/normalize.js';
import { searchItems, sortItems } from '../dist/shared/query.js';
import {
  coerceStorageData,
  coerceSettings,
  isLikelyImportPayload,
  validateWishlistDraft
} from '../dist/shared/validators.js';
import {
  chooseBestArtworkUrl,
  isUsableArtworkUrl
} from '../dist/content/parser.js';

test('normalizeAppStoreUrl normalizes host, protocol, query, and hash', () => {
  assert.equal(
    normalizeAppStoreUrl('http://apps.apple.com/jp/app/example/id12345?pt=1#details'),
    'https://apps.apple.com/jp/app/example/id12345'
  );
});

test('normalizeUrl preserves asset hosts and query strings', () => {
  assert.equal(
    normalizeUrl('http://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/icon.png?x=123#frag'),
    'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/icon.png?x=123'
  );
});

test('pickBestSrcsetUrl prefers the largest srcset candidate', () => {
  assert.equal(
    pickBestSrcsetUrl(
      'https://is1-ssl.mzstatic.com/image/thumb/app.png/200x200ia-75.webp 200w, https://is1-ssl.mzstatic.com/image/thumb/app.png/400x400ia-75.webp 400w'
    ),
    'https://is1-ssl.mzstatic.com/image/thumb/app.png/400x400ia-75.webp'
  );
});

test('repairLikelyBrokenAppleAssetUrl repairs legacy broken apple asset URLs', () => {
  assert.equal(
    repairLikelyBrokenAppleAssetUrl(
      'https://apps.apple.com/image/thumb/Purple221/v4/icon.png'
    ),
    'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/icon.png'
  );
});

test('artwork selection rejects share image and prefers mzstatic icon', () => {
  assert.equal(
    isUsableArtworkUrl('https://apps.apple.com//assets/images/share/app-store.png'),
    false
  );

  assert.equal(
    chooseBestArtworkUrl([
      {
        url: 'https://apps.apple.com//assets/images/share/app-store.png',
        source: 'meta'
      },
      {
        url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/icon.png/400x400ia-75.webp',
        source: 'picture'
      }
    ]),
    'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/icon.png/400x400ia-75.webp'
  );
});

test('matchesAppStoreDetailUrl accepts detail pages and rejects search pages', () => {
  assert.equal(
    matchesAppStoreDetailUrl(
      'https://apps.apple.com/jp/app/%E8%A1%80%E3%81%AE%E5%A4%9C/id6505011516'
    ),
    true
  );
  assert.equal(
    matchesAppStoreDetailUrl(
      'https://apps.apple.com/jp/iphone/search?term=%E8%A1%80%E3%81%AE%E5%A4%9C'
    ),
    false
  );
  assert.equal(matchesAppStoreDetailUrl('https://apps.apple.com/jp/app/id6505011516'), true);
});

test('parseAppIdFromString extracts numeric app id', () => {
  assert.equal(
    parseAppIdFromString('https://apps.apple.com/jp/app/example/id987654321'),
    '987654321'
  );
  assert.equal(
    parseAppIdFromString('app-id=6505011516, app-argument=https://apps.apple.com/jp/app/id6505011516'),
    '6505011516'
  );
  assert.equal(parseAppIdFromString('no app id here'), null);
});

test('isLikelyImportPayload requires wishlist root object', () => {
  assert.equal(isLikelyImportPayload({ wishlist: {} }), true);
  assert.equal(isLikelyImportPayload({ foo: 'bar' }), false);
  assert.equal(isLikelyImportPayload(null), false);
});

test('coerceStorageData re-keys items by appId', () => {
  const data = coerceStorageData({
    schemaVersion: '1.0.1',
    wishlist: {
      brokenKey: {
        appId: '123456',
        url: 'https://apps.apple.com/jp/app/example/id123456',
        canonicalUrl: 'https://apps.apple.com/jp/app/example/id123456',
        name: 'Example',
        developer: 'Dev',
        iconUrl: 'https://is1-ssl.mzstatic.com/image/thumb/app.png/200x200.jpg',
        screenshotUrl: null,
        priceText: '無料',
        ratingValue: null,
        ratingText: null,
        reviewCount: null,
        reviewCountText: null,
        category: null,
        platform: 'iphone',
        note: '',
        tags: [],
        addedAt: '2026-03-11T00:00:00.000Z',
        updatedAt: '2026-03-11T00:00:00.000Z',
        sourceLocale: 'jp',
        isRemovedFromStore: false,
        rawSnapshot: null
      }
    },
    settings: {},
    meta: {}
  });

  assert.deepEqual(Object.keys(data.wishlist), ['123456']);
});

test('coerceSettings fills new popup display settings safely', () => {
  const settings = coerceSettings({
    iconSize: 'large',
    dateDisplayFormat: 'relative'
  });

  assert.equal(settings.iconSize, 'large');
  assert.equal(settings.dateDisplayFormat, 'relative');
  assert.equal(settings.showCategory, true);
});

test('searchItems matches name, developer, note, and tags', () => {
  const items = [
    {
      appId: '1',
      url: 'https://apps.apple.com/jp/app/a/id1',
      canonicalUrl: 'https://apps.apple.com/jp/app/a/id1',
      name: 'Focus Flow',
      developer: 'Acme Studio',
      iconUrl: 'https://example.com/icon.png',
      screenshotUrl: null,
      priceText: '無料',
      ratingValue: null,
      ratingText: null,
      reviewCount: null,
      reviewCountText: null,
      category: null,
      platform: 'iphone',
      note: '作業集中に使う',
      tags: ['仕事', 'timer'],
      addedAt: '2026-03-11T00:00:00.000Z',
      updatedAt: '2026-03-11T00:00:00.000Z',
      sourceLocale: 'jp',
      isRemovedFromStore: false,
      rawSnapshot: null
    }
  ];

  assert.equal(searchItems(items, 'acme').length, 1);
  assert.equal(searchItems(items, '仕事').length, 1);
  assert.equal(searchItems(items, '集中').length, 1);
  assert.equal(searchItems(items, 'unknown').length, 0);
});

test('sortItems supports MVP sort options', () => {
  const items = [
    {
      appId: '2',
      name: 'Bravo',
      addedAt: '2026-03-10T00:00:00.000Z'
    },
    {
      appId: '1',
      name: 'Alpha',
      addedAt: '2026-03-11T00:00:00.000Z'
    }
  ].map((item) => ({
    url: `https://apps.apple.com/jp/app/example/id${item.appId}`,
    canonicalUrl: `https://apps.apple.com/jp/app/example/id${item.appId}`,
    developer: 'Dev',
    iconUrl: 'https://example.com/icon.png',
    screenshotUrl: null,
    priceText: '無料',
    ratingValue: null,
    ratingText: null,
    reviewCount: null,
    reviewCountText: null,
    category: null,
    platform: 'iphone',
    note: '',
    tags: [],
    updatedAt: item.addedAt,
    sourceLocale: 'jp',
    isRemovedFromStore: false,
    rawSnapshot: null,
    ...item
  }));

  assert.deepEqual(
    sortItems(items, 'added_desc').map((item) => item.appId),
    ['1', '2']
  );
  assert.deepEqual(
    sortItems(items, 'added_asc').map((item) => item.appId),
    ['2', '1']
  );
  assert.deepEqual(
    sortItems(items, 'name_asc').map((item) => item.appId),
    ['1', '2']
  );
});

test('validateWishlistDraft accepts complete drafts and rejects missing app ids', () => {
  const success = validateWishlistDraft({
    appId: '12345',
    url: 'https://apps.apple.com/jp/app/example/id12345',
    canonicalUrl: 'https://apps.apple.com/jp/app/example/id12345?l=en',
    name: ' Example App ',
    developer: ' Example Dev ',
    iconUrl: 'https://example.com/icon.png',
    screenshotUrl: null,
    priceText: '無料',
    ratingValue: null,
    ratingText: null,
    reviewCount: null,
    reviewCountText: null,
    category: null,
    platform: 'iphone',
    sourceLocale: 'jp',
    rawSnapshot: null
  });

  assert.equal(success.success, true);
  assert.equal(success.data.name, 'Example App');
  assert.equal(success.data.developer, 'Example Dev');
  assert.equal(success.data.canonicalUrl, 'https://apps.apple.com/jp/app/example/id12345');

  const updated = validateWishlistDraft(
    {
      ...success.data,
      note: '新しいメモ',
      tags: ['RPG']
    },
    success.data
  );

  assert.equal(updated.success, true);
  assert.equal(updated.data.note, '新しいメモ');
  assert.deepEqual(updated.data.tags, ['RPG']);

  const failure = validateWishlistDraft({
    appId: null,
    url: 'https://apps.apple.com/jp/app/example',
    canonicalUrl: null,
    name: 'Example App',
    developer: 'Example Dev',
    iconUrl: 'https://example.com/icon.png',
    screenshotUrl: null,
    priceText: null,
    ratingValue: null,
    ratingText: null,
    reviewCount: null,
    reviewCountText: null,
    category: null,
    platform: 'iphone',
    sourceLocale: 'jp',
    rawSnapshot: null
  });

  assert.equal(failure.success, false);
  assert.equal(failure.errorCode, 'ERR_MISSING_APP_ID');
});

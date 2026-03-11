# App Store Wishlist

`spec.md` を実装基準とした Chrome Extension Manifest V3 の MVP 実装です。

## 開発

```bash
npm run build
npm test
```

`scripts/build.mjs` は Node の `stripTypeScriptTypes` を使うため、実行時に experimental warning が出ますが、ビルド自体は正常です。

## ローカル確認

1. `npm run build`
2. Chrome の `chrome://extensions` でデベロッパーモードを有効にする
3. 「パッケージ化されていない拡張機能を読み込む」でこのリポジトリのルートを選ぶ
4. App Store 詳細ページを開いて保存ボタンの表示、追加、保存済み表示、再解除を確認する
5. popup を開いて一覧、検索、ソート、削除、書き出しを確認する
6. options で設定保存、JSON import/export、全件削除を確認する

## 手動試験の推奨観点

- `https://apps.apple.com/jp/app/.../id...` 形式の詳細ページでのみボタンが表示される
- 検索結果ページやランキング画面ではボタンが表示されない
- App Store の locale が違っても同一 appId で重複保存されない
- 壊れた import JSON は拒否され、部分破損データはスキップされる

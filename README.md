# App Store Wishlist

Web 版 App Store のアプリ詳細ページから、気になるアプリを Chrome 拡張機能内のウィッシュリストへ保存する Manifest V3 拡張機能です。  
実装基準は [spec.md](./spec.md) です。

## 概要

この拡張機能は `https://apps.apple.com/*` 配下の App Store 詳細ページを判定し、ページ上に「ウィッシュリストに追加」ボタンを挿入します。保存したアプリは popup から一覧表示でき、検索、ソート、削除、メモ・タグ編集、JSON export/import が行えます。

外部サーバー連携、アカウント機能、価格監視は実装していません。データは `chrome.storage.local` にのみ保存されます。

## 主な機能

- App Store 詳細ページへの保存ボタン挿入
- 保存済み状態の表示とページ上からの解除
- popup での一覧表示
- アプリ名、開発者名、タグ、メモでの検索
- 新しい順、古い順、名前順、評価順、価格順、開発者順のソート
- popup から App Store ページを開く、削除する、メモ・タグを編集する
- options で設定変更
- JSON export / import
- 全件削除
- MutationObserver による自動再解析
- App Store DOM 差異に備えた複数経路の `appId` / アイコン抽出

## 現在の実装範囲

MVP として実用可能な範囲までは実装済みです。特に以下は利用可能です。

- App Store 詳細ページ判定
- `appId` 抽出
- 追加ボタン挿入
- 永続保存
- popup 一覧、検索、ソート、削除
- options の設定、JSON import/export
- メモ、タグの保存と編集

一方で、fixture ベースの parser 結合テストや build パイプラインの安定化など、公開前にさらに詰めたい点は残っています。

## 動作要件

- Google Chrome
- Node.js 22 以降を推奨

`scripts/build.mjs` は Node の `stripTypeScriptTypes` を使うため、`npm run build` 時に experimental warning が表示されます。現状の build では想定内です。

## セットアップ

```bash
npm run build
```

## Chrome への読み込み方法

1. Chrome で `chrome://extensions` を開く
2. 右上のデベロッパーモードを有効にする
3. 「パッケージ化されていない拡張機能を読み込む」を押す
4. このリポジトリのルート `/Users/renzou/Downloads/appstore-wishlist` を選択する

`dist/` は build 生成物なので、clone 直後は必ず `npm run build` を実行してください。

## 使い方

1. `https://apps.apple.com/jp/app/.../id...` 形式の App Store 詳細ページを開く
2. ページ上の「ウィッシュリストに追加」を押す
3. popup を開いて保存済みアプリを確認する
4. popup から検索、ソート、削除、メモ・タグ編集を行う
5. options から表示設定、削除確認、JSON import/export を行う

検索結果ページやランキング画面では、原則として保存ボタンは表示されません。

## 開発コマンド

```bash
npm run build
npm test
npm run clean
```

## ディレクトリ構成

```text
src/
  background/   service worker とメッセージ処理
  content/      詳細ページ判定、DOM 解析、ボタン注入、再解析
  popup/        一覧 UI
  options/      設定、データ管理 UI
  shared/       型、repository、正規化、バリデーション、共通処理
public/icons/   拡張機能アイコン
scripts/        build スクリプト
tests/          単体テスト
```

## 権限

- `storage`
- host permission: `https://apps.apple.com/*`

`scripting`、`activeTab`、`history`、`cookies` などは使用していません。

## 手動確認手順

1. `npm run build`
2. `chrome://extensions` で再読み込み
3. App Store 詳細ページで保存ボタンの表示、追加、保存済み表示、再解除を確認
4. popup で一覧、検索、ソート、削除、編集を確認
5. options で設定保存、JSON import/export、全件削除を確認

## 手動試験の推奨観点

- `https://apps.apple.com/jp/app/.../id...` 形式の詳細ページでのみボタンが表示される
- 検索結果ページやランキング画面ではボタンが表示されない
- App Store の locale が違っても同一 `appId` で重複保存されない
- 画像 URL が App Store 共有画像ではなく、アプリアイコンを拾えている
- 壊れた import JSON は拒否され、部分破損データはスキップされる
- popup のメモ・タグ編集結果が再読込後も保持される

## 注意点

- 既に誤ったアイコン URL で保存済みのアイテムは、自動で直らない場合があります。その場合は一度削除して再保存してください。
- build 生成物の `dist/` は Git 管理対象外です。
- 自動再解析は iTunes Search Lookup API ではなく、ページ DOM の変化監視によって行います。

## ライセンス

必要に応じて追加してください。

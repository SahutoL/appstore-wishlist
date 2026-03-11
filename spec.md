# App Store Wishlist for Chrome 拡張機能 仕様書
Version: 1.0.0
Status: Draft / Implementation Ready
Target: Google Chrome Extension (Manifest V3)
Primary Language: TypeScript
UI Language: 日本語
Document Language: 日本語

---

# 1. 文書の目的

本仕様書は、Apple の Web 版 App Store におけるアプリ詳細ページ上に「ウィッシュリストに追加」ボタンを表示し、ユーザーが気になるアプリをブラウザ拡張機能内で保存・閲覧・管理できる Chrome 拡張機能の完全仕様を定義するものである。

本仕様書は以下を目的とする。

1. 実装者が追加の解釈なしで着手できること
2. UI、状態管理、保存データ、画面遷移、DOM 解析、異常系、将来拡張までを一貫した論理で定義すること
3. 実装・試験・保守時の判断基準を提供すること

---

# 2. プロダクト概要

## 2.1 名称

仮称:
App Store Wishlist

正式名称は実装時に変更可能だが、本仕様書では便宜上「本拡張機能」と呼称する。

## 2.2 提供価値

本拡張機能は、Web ブラウザ上で App Store のアプリを閲覧する際に、以下の価値を提供する。

1. アプリ詳細ページから直接ウィッシュリストへ追加できる
2. 保存済みアプリを拡張機能ポップアップから一覧閲覧できる
3. App Store を想起させる視認性の高い UI で整理できる
4. ブラウザの通常ブックマークよりも、アプリ情報に特化した保存体験を提供する
5. 保存済みかどうかを詳細ページ上で即座に判別できる

## 2.3 非目的

本仕様書の対象外は以下のとおりである。

1. 収益化
2. ユーザーアカウント機能
3. 外部サーバーとの同期
4. 他ブラウザ対応
5. App Store 以外のストア対応
6. 価格変動の自動監視
7. バックエンド API の構築

---

# 3. 対象サイト

## 3.1 対象ドメイン

本拡張機能は以下の URL パターンを対象とする。

- https://apps.apple.com/*
- https://apps.apple.com/jp/*
- その他 apps.apple.com 配下の各ロケール

## 3.2 対象ページ

本拡張機能が主対象とするページは以下である。

1. App Store のアプリ詳細ページ
2. アプリ詳細ページ以外では、原則としてボタン挿入を行わない

## 3.3 アプリ詳細ページの判定条件

アプリ詳細ページであるとみなす条件は、以下の複数判定のいずれかを満たす場合とする。

優先順:
1. URL に `/app/` を含む
2. ページ内にアプリ名相当の見出しが存在する
3. ページ内にアプリアイコン相当の要素が存在する
4. ページ内から App ID 相当の情報を抽出できる
5. 構造化データまたはメタ情報からソフトウェア情報が抽出できる

なお、単一条件への過度な依存を避けるため、最低 2 系統以上の情報源を用いた判定を推奨する。

---

# 4. 実装アーキテクチャ

## 4.1 構成要素

本拡張機能は以下のコンポーネントで構成する。

1. manifest.json
2. service worker
3. content script
4. popup UI
5. options page
6. 共通データモデル層
7. 共通 storage アクセス層
8. 共通 DOM 解析層
9. 共通メッセージ通信層
10. スタイルシートおよびアセット

## 4.2 論理責務分離

### 4.2.1 content script の責務

1. 対象ページ判定
2. ページ情報抽出
3. ボタン挿入
4. ボタン状態更新
5. ユーザー操作受付
6. service worker へのメッセージ送信
7. ページ変化監視

### 4.2.2 service worker の責務

1. ストレージ操作の一元化
2. 重複追加防止
3. データ整形
4. import/export の補助
5. popup / content script 間の橋渡し
6. バージョン移行処理
7. 例外ログの集約

### 4.2.3 popup の責務

1. ウィッシュリスト一覧表示
2. 検索
3. ソート
4. 削除
5. ページを開く
6. 一覧の視覚的な管理
7. 保存件数表示
8. 空状態表示

### 4.2.4 options page の責務

1. 設定の編集
2. データ export
3. データ import
4. 一括削除
5. デバッグ情報表示
6. バージョン情報表示

---

# 5. 機能要件一覧

## 5.1 必須機能

1. App Store のアプリ詳細ページ上に「ウィッシュリストに追加」ボタンを表示する
2. ボタン押下でアプリを保存できる
3. 保存済みアプリは再度重複追加されない
4. 保存済み状態がページ上で判別できる
5. popup から保存済みアプリ一覧を閲覧できる
6. popup でアプリ名検索ができる
7. popup でソートができる
8. popup から App Store ページを開ける
9. popup から個別削除できる
10. ローカル永続保存できる
11. App Store 風の一覧デザインを持つ
12. エラー発生時に機能全体が停止しない

## 5.2 推奨機能

1. メモ保存
2. タグ保存
3. アイコンとスクリーンショット表示
4. 保存日時表示
5. 追加成功トースト表示
6. ページ遷移後の自動再判定
7. 設定ページで JSON export/import
8. 一括クリア
9. 保存件数上限の安全制御
10. 開発者名・価格・カテゴリ表示

## 5.3 将来拡張機能

1. 価格差分記録
2. 既読・未読状態
3. フィルタリング強化
4. リスト分割
5. side panel 表示
6. 複数デバイス同期
7. 共有 URL 生成
8. CSV export
9. スクリーンショットギャラリー
10. 比較ビュー

---

# 6. ユーザーストーリー

## 6.1 保存

- ユーザーとして、App Store で見つけた気になるアプリを、その場でウィッシュリストへ追加したい。
- そうすることで、後でまとめて確認できる。

## 6.2 一覧確認

- ユーザーとして、保存したアプリを一覧で見たい。
- そうすることで、気になるアプリを比較しやすくなる。

## 6.3 再訪

- ユーザーとして、保存済みアプリの App Store ページへすぐ戻りたい。
- そうすることで、購入や詳細確認を素早く行える。

## 6.4 重複回避

- ユーザーとして、同じアプリを何度も追加したくない。
- そうすることで、一覧を整理された状態に保てる。

## 6.5 管理

- ユーザーとして、不要になったアプリを削除したい。
- そうすることで、一覧を自分用に保守できる。

---

# 7. 画面仕様

## 7.1 画面一覧

1. content UI: App Store 詳細ページ上の追加ボタン
2. popup: ウィッシュリスト一覧
3. options: 設定・インポート/エクスポート・一括削除
4. 任意補助 UI: トースト、確認ダイアログ、空状態、エラー表示

---

# 8. App Store ページ上ボタン仕様

## 8.1 ボタン表示位置

### 8.1.1 基本方針

ボタンは、ユーザーが現在閲覧しているアプリの主操作領域付近に表示する。
本仕様における主目標位置は、「こちらで表示：Mac App Store」ボタンの隣である。

### 8.1.2 位置探索優先順位

以下の順序で挿入位置を探索する。

1. 「こちらで表示：Mac App Store」を含むボタンまたはリンク要素の直近横
2. アプリ主操作領域内の既存 CTA 群の末尾
3. アプリタイトル直下のメタ情報エリア
4. アプリヘッダ領域の右端
5. フォールバックとしてタイトル下の独立行

### 8.1.3 レイアウト方針

1. 既存 UI を覆わない
2. レスポンシブで折り返し可能
3. DOM 崩壊時は自拡張要素のみがレイアウト変更される
4. ページの本来機能を阻害しない
5. 過剰な z-index を使わない

## 8.2 ボタン文言

未保存時:
- ウィッシュリストに追加

保存済み時:
- 保存済み

処理中:
- 追加中...
- 更新中...

失敗時:
- 再試行

## 8.3 ボタンアイコン

推奨:
- 未保存: ハート枠線
- 保存済み: チェック付きハート、または塗りハート
- 失敗: 警告または再試行

ただし、Apple 公式アセットを直接模倣せず、独自実装の SVG を利用する。

## 8.4 ボタン状態遷移

状態一覧:
1. idle-unadded
2. idle-added
3. loading-add
4. loading-remove
5. error
6. disabled

遷移:
- 初期読込時に appId が未保存なら idle-unadded
- 初期読込時に appId が保存済みなら idle-added
- 追加ボタン押下で loading-add
- 成功で idle-added
- 失敗で error
- 再試行で loading-add
- 保存済みボタンを再クリック可能とするかは設定依存とする
- MVP ではページ上からの削除は任意機能とし、既定では削除不可でもよい

## 8.5 トースト表示

追加成功:
- ウィッシュリストに追加しました

重複:
- すでに保存されています

失敗:
- 保存に失敗しました

表示仕様:
1. 2.0 秒から 3.0 秒程度で自動消滅
2. 画面右下またはボタン近傍に表示
3. 複数同時表示は避け、最新 1 件のみ表示

---

# 9. popup 仕様

## 9.1 目的

popup は、保存済みアプリを短時間で確認・検索・削除・再訪するための UI である。

## 9.2 デザイン方針

1. App Store 風の清潔で余白の多いデザイン
2. 白背景または淡色背景
3. 角丸カード
4. 左にアイコン、右にタイトル群
5. タイポグラフィは読みやすさ優先
6. 情報密度は中程度
7. 1 行内で完結しない場合は 2 行構成も許容

## 9.3 popup 構成

上から順に以下を配置する。

1. ヘッダ
2. 件数表示
3. 検索バー
4. ソート選択
5. リスト本体
6. フッタ操作
7. 空状態またはエラー状態

## 9.4 popup サイズ

推奨:
- 幅: 380px 前後
- 高さ: 560px 前後
- 最小幅: 340px
- 最小高さ: 480px

リスト部は縦スクロール可能とする。

## 9.5 ヘッダ仕様

表示内容:
- タイトル: ウィッシュリスト
- サブ情報: 保存件数

例:
- ウィッシュリスト
- 12 件

## 9.6 検索バー仕様

対象:
- アプリ名
- 開発者名
- タグ
- メモ

プレースホルダ:
- アプリ名・開発者・タグで検索

検索方式:
- フロント側インクリメンタル検索
- 大文字小文字は区別しない
- 全角半角の完全正規化までは必須でないが、空白除去と前後 trim は必須

## 9.7 ソート仕様

選択肢:
1. 新しい順
2. 古い順
3. 名前順
4. 評価順
5. 価格順
6. 開発者順

MVP 必須:
1. 新しい順
2. 古い順
3. 名前順

## 9.8 リストアイテム仕様

各アイテムは以下の情報を持つ。

必須表示:
1. アイコン
2. アプリ名
3. 開発者名
4. 価格
5. App Store を開くボタン
6. 削除ボタン

推奨表示:
1. 評価
2. レビュー件数
3. カテゴリ
4. タグ
5. メモの有無
6. 保存日時

## 9.9 リストアイテムレイアウト

左カラム:
- アプリアイコン

中央カラム:
- 1 行目: アプリ名
- 2 行目: 開発者名
- 3 行目: カテゴリ / 価格 / 評価 の補助情報

右カラム:
- 開く
- 削除
- 任意でメニュー

## 9.10 リストアイテム操作

1. アイテム本体クリック: App Store ページを新しいタブで開く
2. 開くボタン: 同上
3. 削除ボタン: 確認の上削除
4. 任意で右クリック相当メニュー: なしでも可

## 9.11 空状態

条件:
- 保存件数 0 件

表示:
- アイコン
- 「まだウィッシュリストは空です」
- 「App Store のアプリ詳細ページで追加できます」

## 9.12 エラー状態

条件:
- ストレージ読み込み失敗
- データ破損

表示:
- 「データの読み込みに失敗しました」
- 「再読み込み」ボタン
- 必要に応じて「初期化」導線

---

# 10. options 画面仕様

## 10.1 目的

詳細設定・データ管理・保守操作を行う画面とする。

## 10.2 セクション構成

1. 基本設定
2. データ管理
3. 表示設定
4. デバッグ情報
5. バージョン情報

## 10.3 基本設定

項目:
1. ページ上で保存済み表示を強調するか
2. トースト表示を有効にするか
3. popup で削除前確認を出すか
4. ページ上ボタンから削除を許可するか
5. 自動再解析を有効にするか

## 10.4 データ管理

項目:
1. JSON export
2. JSON import
3. 全件削除
4. 件数表示
5. 最終更新日時表示

## 10.5 表示設定

項目:
1. 既定ソート
2. popup で表示する補助情報
3. アイコンサイズ
4. 日付表示形式

---

# 11. データモデル

## 11.1 保存単位

1 アプリ = 1 レコード とする。

## 11.2 主キー

主キーは `appId` とする。

App ID が抽出できない場合は、暫定的に `canonicalUrl` を用いた疑似キーを生成できるが、MVP では appId 抽出失敗時は保存失敗扱いとしてよい。

## 11.3 WishlistItem 定義

項目定義:

- appId: string
  - 必須
  - 一意
  - App Store 上のアプリ識別子

- url: string
  - 必須
  - 保存元の正規 URL

- canonicalUrl: string
  - 推奨
  - URL 正規化後の値

- name: string
  - 必須
  - アプリ名

- developer: string
  - 必須
  - 開発者名

- iconUrl: string
  - 必須
  - アプリアイコン URL

- screenshotUrl: string | null
  - 任意
  - 代表スクリーンショット URL

- priceText: string | null
  - 任意
  - 価格または「無料」「入手」等の表示文字列

- ratingValue: number | null
  - 任意
  - 数値評価

- ratingText: string | null
  - 任意
  - UI 表示用テキスト

- reviewCount: number | null
  - 任意
  - 数値レビュー件数

- reviewCountText: string | null
  - 任意
  - UI 表示用テキスト

- category: string | null
  - 任意
  - カテゴリ名

- platform: string | null
  - 任意
  - mac / iphone / ipad / universal / unknown

- note: string
  - 任意
  - ユーザーメモ

- tags: string[]
  - 任意
  - ユーザータグ配列

- addedAt: string
  - 必須
  - ISO 8601 文字列

- updatedAt: string
  - 必須
  - ISO 8601 文字列

- sourceLocale: string | null
  - 任意
  - 保存元ページのロケール

- isRemovedFromStore: boolean
  - 初期値 false
  - 将来拡張

- rawSnapshot: object | null
  - 任意
  - デバッグ用の抽出スナップショット

## 11.4 設定データ定義

Settings:

- version: string
- defaultSort: string
- confirmBeforeDelete: boolean
- enableToast: boolean
- highlightSavedState: boolean
- allowRemoveFromPageButton: boolean
- enableAutoRescan: boolean
- showCategory: boolean
- showRating: boolean
- showPrice: boolean
- showNoteIndicator: boolean

## 11.5 ストレージ全体構造

ルート構造:

- schemaVersion: string
- wishlist: Record<string, WishlistItem>
- settings: Settings
- meta:
  - lastExportedAt: string | null
  - lastImportedAt: string | null
  - createdAt: string
  - updatedAt: string

---

# 12. URL 正規化仕様

## 12.1 目的

同一アプリに複数の URL 表現が存在しても、重複保存を防ぐために URL を正規化する。

## 12.2 正規化ルール

1. クエリ文字列を除去する
2. ハッシュを除去する
3. 末尾スラッシュを統一する
4. プロトコルは https に統一する
5. ホストは apps.apple.com に統一する
6. 不要なトラッキングパラメータは捨てる
7. locale 差異があっても appId が一致すれば同一アプリとみなす

---

# 13. DOM 解析仕様

## 13.1 基本方針

ページ構造の変化に備え、単一 selector に依存せず、複数経路で情報抽出する。

## 13.2 抽出対象

1. appId
2. name
3. developer
4. iconUrl
5. screenshotUrl
6. priceText
7. ratingValue / ratingText
8. reviewCount / reviewCountText
9. category
10. platform
11. canonicalUrl
12. sourceLocale

## 13.3 抽出優先ソース

優先度:
1. URL
2. canonical link
3. 構造化データ
4. Open Graph / meta
5. 可視 DOM
6. 補助推定

## 13.4 appId 抽出

抽出順:
1. URL の `/id123456789` パターン
2. canonical URL
3. 構造化データ
4. 内部リンク
5. データ属性

正規表現例:
- `/id(\d+)/`

appId が数値文字列で抽出できた場合のみ有効とする。

## 13.5 name 抽出

抽出順:
1. 主見出し要素
2. meta title
3. og:title
4. 構造化データの name

空文字なら失敗。

## 13.6 developer 抽出

抽出順:
1. 開発者表示リンク
2. 補助メタ領域
3. 構造化データ
4. DOM 推定

## 13.7 iconUrl 抽出

抽出順:
1. アプリアイコン img
2. og:image
3. 構造化データ image
4. 画像候補から最小誤判定ロジックで採用

## 13.8 screenshotUrl 抽出

抽出順:
1. スクリーンショットカルーセル先頭
2. 構造化データ image 配列
3. 代表画像候補

なくても保存可能。

## 13.9 priceText 抽出

抽出順:
1. 主ボタン群の価格表示
2. 補助メタ情報
3. 構造化データ offers
4. 文言推定

保持形式は文字列とする。
通貨変換は行わない。

## 13.10 rating / reviewCount 抽出

抽出順:
1. 可視評価 UI
2. aria-label 解析
3. 構造化データ aggregateRating
4. テキスト正規表現

ratingValue は number、reviewCount は number へ正規化する。
失敗時は null。

## 13.11 category 抽出

抽出順:
1. メタ情報領域
2. ナビゲーションリンク
3. 構造化データ

## 13.12 platform 抽出

対象表示例:
- Mac
- iPhone
- iPad

判定:
1. 「こちらで表示：Mac App Store」等の周辺文言
2. ページ URL 文脈
3. 対応デバイス表記

値:
- mac
- iphone
- ipad
- universal
- unknown

## 13.13 DOM 監視

Single Page Application 的な部分更新や遅延描画に対応するため、MutationObserver を用いる。

監視対象:
1. body
2. main
3. アプリヘッダ周辺

監視戦略:
1. 初回読込直後に解析
2. 要素未出現なら一定期間再試行
3. 監視イベント乱発時は debounce
4. 同一 appId 上で重複挿入しない

---

# 14. ストレージ仕様

## 14.1 保存方式

ローカル永続保存を採用する。
外部サーバーには送信しない。

## 14.2 保存 API 方針

ストレージアクセスは共通 repository 層を介して行う。
UI 層から直接複数箇所で raw storage API を叩かない。

## 14.3 一貫性要件

1. 追加時は appId 主キーで upsert
2. 更新時は addedAt を保持し updatedAt を更新
3. 削除時は完全削除
4. データ破損時は回復不能レコードのみ隔離または除去
5. schemaVersion を保持してマイグレーション可能にする

## 14.4 上限設計

厳密上限は設けなくてよいが、10,000 件程度までは UI が極端に破綻しない設計を推奨する。
MVP では仮想スクロールは不要。

---

# 15. メッセージ通信仕様

## 15.1 content script -> service worker

種別:
- GET_PAGE_STATUS
- ADD_WISHLIST_ITEM
- REMOVE_WISHLIST_ITEM
- GET_SETTINGS
- PING

## 15.2 popup -> service worker

種別:
- GET_ALL_ITEMS
- SEARCH_ITEMS
- REMOVE_ITEM
- OPEN_OPTIONS
- EXPORT_DATA
- IMPORT_DATA
- CLEAR_ALL
- GET_STATS

## 15.3 response 共通形式

- success: boolean
- data: any
- errorCode: string | null
- message: string | null

## 15.4 エラーコード例

- ERR_INVALID_APP_PAGE
- ERR_PARSE_FAILED
- ERR_MISSING_APP_ID
- ERR_DUPLICATE_ITEM
- ERR_STORAGE_READ_FAILED
- ERR_STORAGE_WRITE_FAILED
- ERR_INVALID_IMPORT_FORMAT
- ERR_UNKNOWN

---

# 16. 詳細ユースケース仕様

## 16.1 アプリ追加フロー

前提:
- ユーザーが App Store のアプリ詳細ページを開いている

手順:
1. content script が対象ページと判定する
2. ページ情報を抽出する
3. appId を取得する
4. 既存保存状態を取得する
5. 未保存なら「ウィッシュリストに追加」ボタンを表示する
6. ユーザーがボタンを押す
7. content script が抽出済みデータを service worker へ送信する
8. service worker がデータ検証を行う
9. 既存データと重複判定する
10. 新規なら保存する
11. 保存成功を返す
12. content script がボタン表示を「保存済み」に更新する
13. トーストを表示する

事後条件:
- popup 一覧で該当アイテムが見える
- ページ上でも保存済みが分かる

## 16.2 popup 表示フロー

1. ユーザーが拡張機能アイコンを押す
2. popup が起動する
3. service worker から全件を取得する
4. 設定に従いソートする
5. 一覧を描画する
6. 件数を表示する

## 16.3 検索フロー

1. ユーザーが検索文字列を入力する
2. 入力値を trim する
3. アプリ名・開発者名・タグ・メモに対して部分一致検索する
4. 該当項目のみ表示する

## 16.4 削除フロー

1. ユーザーが削除ボタンを押す
2. 設定で確認ダイアログ有効なら確認を行う
3. 確定後 service worker へ削除要求を送る
4. 削除成功後、一覧から要素を除去する
5. 件数を更新する
6. 現在開いているアプリ詳細ページが同一 appId の場合、次回ステータス更新で未保存表示へ戻る

---

# 17. UI デザイン仕様

## 17.1 視覚コンセプト

1. Apple 的な整理感を連想させる
2. ただし Apple 公式 UI の複製にはしない
3. 独自実装のアイコン・コンポーネントを用いる
4. 清潔感、白基調、淡い境界線、丸角を採用する

## 17.2 カラートークン例

- background: #ffffff
- backgroundSecondary: #f5f5f7
- textPrimary: #1d1d1f
- textSecondary: #6e6e73
- border: #d2d2d7
- accent: #0071e3
- accentHover: #0077ed
- danger: #d70015
- success: #1d9c4a

## 17.3 角丸

- ボタン: 12px
- カード: 16px
- アイコン: 20px 以上の丸み許容

## 17.4 余白

- popup 外枠: 16px
- リストアイテム内余白: 12px
- セクション間余白: 12px から 16px

## 17.5 文字サイズ

- 見出し: 18px
- サブ見出し: 14px
- 本文: 13px
- 補助: 12px

---

# 18. アクセシビリティ仕様

## 18.1 基本要件

1. ボタンはすべてキーボード操作可能
2. aria-label を付与する
3. 色だけで状態を表現しない
4. 十分なコントラストを確保する
5. フォーカスリングを消さない

## 18.2 キーボード操作

popup 内:
- Tab: 次要素
- Shift+Tab: 前要素
- Enter: 開く / 決定
- Delete または Backspace: 任意で削除ショートカット
- Esc: 検索欄フォーカス解除または標準 popup 閉動作

## 18.3 スクリーンリーダー

リストアイテムは以下を読み上げ可能にする。
- アプリ名
- 開発者
- 価格
- 保存日時
- 開くボタン
- 削除ボタン

---

# 19. セキュリティ・プライバシー仕様

## 19.1 収集データ

保存対象は、ユーザーが明示操作により保存した App Store の公開情報と、ユーザーが任意入力したメモ・タグのみとする。

## 19.2 非収集データ

以下は収集しない。
1. Apple ID
2. 購入履歴
3. 閲覧履歴全般
4. 入力フォーム内容一般
5. 外部送信可能な個人情報

## 19.3 外部通信

MVP では外部サーバー通信を行わない。
すべてのデータはローカルに留める。

## 19.4 権限最小化

manifest では必要最小限の権限のみ宣言する。
広範な権限を避ける。

---

# 20. 権限仕様

## 20.1 必須権限

- storage

## 20.2 ホスト権限

- https://apps.apple.com/*

## 20.3 任意権限

- tabs
  - 新規タブを開く挙動の実装方式によっては不要化も検討可能

## 20.4 不要とする権限

原則として以下は不要:
- downloads
- history
- bookmarks
- cookies
- identity
- notifications
- scripting
- activeTab

注:
content_scripts で固定注入する設計を採るため、MVP では scripting は不要とする。
将来的に動的注入を採用する場合は再検討する。

---

# 21. manifest 設計仕様

## 21.1 基本

- manifest_version: 3
- name: 本拡張機能名
- version: semver
- description: 機能説明
- icons: 16 / 32 / 48 / 128

## 21.2 action

- default_popup: popup.html
- default_title: ウィッシュリスト

## 21.3 background

- service_worker: background.js

## 21.4 content_scripts

対象:
- matches: https://apps.apple.com/*
- js: content.js
- css: content.css
- run_at: document_idle

## 21.5 options_page

- options.html

---

# 22. 推奨ディレクトリ構成

project-root/
  src/
    background/
      index.ts
      handlers.ts
    content/
      index.ts
      inject.ts
      parser.ts
      observer.ts
      state.ts
      content.css
    popup/
      popup.html
      popup.ts
      popup.css
      components/
        Header.ts
        SearchBar.ts
        SortSelect.ts
        WishlistList.ts
        WishlistItemCard.ts
        EmptyState.ts
    options/
      options.html
      options.ts
      options.css
    shared/
      models.ts
      storage.ts
      messages.ts
      constants.ts
      normalize.ts
      logger.ts
      validators.ts
      date.ts
  public/
    icons/
      icon16.png
      icon32.png
      icon48.png
      icon128.png
  manifest.json
  package.json
  tsconfig.json
  README.md

---

# 23. バリデーション仕様

## 23.1 WishlistItem 保存前検証

必須:
1. appId が存在する
2. name が空でない
3. developer が空でない
4. iconUrl が URL 文字列である
5. url が URL 文字列である
6. addedAt / updatedAt が ISO 8601 である

## 23.2 文字列正規化

1. trim
2. 連続空白の圧縮
3. null/undefined の安全処理
4. 制御文字除去
5. ユーザーメモは最大文字数を設ける

## 23.3 文字数制限

推奨:
- note: 500 文字
- tag: 30 文字
- tag 数: 10 個

---

# 24. ログ仕様

## 24.1 開発時

console 出力を許容する。

## 24.2 本番時

1. 不要な verbose ログは無効
2. 重大エラーのみ出力
3. ユーザー向けには簡潔な文言を表示

## 24.3 ログカテゴリ

- parser
- inject
- storage
- popup
- options
- migration

---

# 25. エラーハンドリング仕様

## 25.1 原則

1. 1 箇所の失敗で全機能停止しない
2. UI は可能な範囲で機能継続する
3. 復旧不能な場合のみ簡潔なエラー表示を行う

## 25.2 想定エラー

1. DOM 解析失敗
2. appId 抽出失敗
3. ストレージ書き込み失敗
4. ストレージ読み込み失敗
5. popup 描画失敗
6. import データ破損
7. 同一ページで多重挿入
8. MutationObserver の過剰発火

## 25.3 個別対応

### DOM 解析失敗
- ボタンを出さない
- 可能なら再試行
- デバッグログを残す

### appId 抽出失敗
- 保存ボタンを disabled
- ツールチップまたはエラー表示
- 「このページでは追加できません」

### ストレージ失敗
- ボタン状態を元に戻す
- トーストで失敗通知
- popup 側は再読み込み導線

### import データ破損
- 破損行を除外
- 件数と失敗件数を通知
- 完全破損なら import 中止

---

# 26. パフォーマンス要件

## 26.1 content script

1. 初回解析は 500ms 未満を目標
2. MutationObserver は debounce する
3. 過度な querySelectorAll の乱用を避ける
4. 解析成功後は監視頻度を落とす

## 26.2 popup

1. 100 件程度なら体感即時表示
2. 検索入力から 100ms 程度で更新
3. 画像遅延読み込みを許容
4. 文字列検索は O(n) で十分

---

# 27. 国際化仕様

## 27.1 MVP

UI 表示言語は日本語固定でも可。

## 27.2 将来拡張

文言は辞書化し、i18n 可能な構造とする。
保存データの値そのものは元ページ由来の言語を保持してよい。

---

# 28. テスト仕様

## 28.1 単体テスト対象

1. URL 正規化
2. appId 抽出
3. 重複判定
4. ソート
5. 検索
6. import/export
7. バリデーション
8. マイグレーション

## 28.2 結合テスト対象

1. App Store ページでボタンが出る
2. 追加後 popup に表示される
3. 重複追加されない
4. 削除後一覧から消える
5. ページ再読込後も保存状態が維持される

## 28.3 手動試験観点

### ページ系
1. Mac App Store 表記ありページ
2. iPhone アプリページ
3. iPad アプリページ
4. 無料アプリ
5. 有料アプリ
6. 評価なしアプリ
7. スクリーンショットなし想定
8. ロケール違いページ
9. ページ構造が少し異なる詳細ページ

### popup 系
1. 0 件
2. 1 件
3. 20 件
4. 100 件
5. 長いアプリ名
6. 長い開発者名
7. メモあり
8. タグあり
9. 削除確認あり/なし

### options 系
1. export 成功
2. import 成功
3. import 破損 JSON
4. 全件削除
5. 設定保持

## 28.4 受け入れ基準

1. App Store 詳細ページの大半でボタンが表示される
2. 追加・一覧・削除が一貫して機能する
3. 重複保存が起きない
4. データがブラウザ再起動後も保持される
5. UI が著しく崩れない
6. 致命的例外で拡張全体が停止しない

---

# 29. import/export 仕様

## 29.1 export 形式

JSON 形式とする。

内容:
- schemaVersion
- wishlist
- settings
- meta
- exportedAt

## 29.2 import 形式

上記 JSON 形式を受け付ける。
未知フィールドは無視可能とする。

## 29.3 競合解決

同一 appId が既存にある場合:
1. 既定では imported 側で上書き
2. 将来拡張で確認ダイアログを出してもよい

---

# 30. マイグレーション仕様

## 30.1 schemaVersion

必ず保持する。

初期:
- 1.0.0

## 30.2 方針

1. 起動時に schemaVersion を確認
2. 現行未満なら順次 migrate
3. 失敗時はバックアップ保持
4. 回復不能なら初期化選択肢を提示

---

# 31. 非機能要件

## 31.1 保守性

1. DOM 解析、保存、UI を分離する
2. 型定義を明示する
3. 定数を一元管理する
4. selector 文字列を散在させない

## 31.2 拡張性

1. ストア追加に耐えうるモデル設計
2. item card を再利用可能にする
3. parser を差し替え可能にする

## 31.3 可読性

1. 命名を英語で統一
2. UI 文言は日本語辞書に分離可能にする
3. ファイル責務を明確にする

---

# 32. MVP 範囲の最終定義

MVP に含む:
1. App Store 詳細ページ判定
2. 「ウィッシュリストに追加」ボタン挿入
3. appId / name / developer / iconUrl / url / priceText の抽出
4. ローカル保存
5. 重複防止
6. popup 一覧
7. 検索
8. 新しい順 / 古い順 / 名前順ソート
9. 個別削除
10. JSON export/import
11. 設定画面
12. トースト表示
13. エラー時の最低限復旧

MVP に含まない:
1. 自動価格追跡
2. サーバー同期
3. ログイン
4. side panel
5. 比較ビュー
6. 複数リスト
7. 通知機能

---

# 33. 開発上の実装ルール

1. 本番コードで any を濫用しない
2. 例外を握りつぶさない
3. DOM selector は定数化する
4. UI 文言は辞書オブジェクト化する
5. 非同期処理は必ずエラー処理を持つ
6. ストレージ操作は repository 経由に限定する
7. popup と options で重複ロジックを持たない
8. パース失敗は null を返し、上位で扱う
9. 追加・削除・取得に対して result 型を統一する
10. CSS は prefix 付きクラス名を用いてページ衝突を避ける

---

# 34. CSS 命名規則

prefix:
- asw-

例:
- asw-button
- asw-button--saved
- asw-toast
- asw-popup
- asw-list
- asw-card
- asw-empty
- asw-danger

ページ汚染防止:
1. グローバルタグセレクタを極力使わない
2. reset CSS を注入しない
3. `all: initial` の乱用を避ける
4. 既存サイト CSS と衝突しにくい命名を徹底する

---

# 35. 既知のリスクと対策

## 35.1 App Store DOM 変更

リスク:
- selector が無効化される

対策:
1. 複数抽出経路
2. フォールバック挿入位置
3. parser テスト
4. selector 定数集中管理

## 35.2 popup の情報量過多

リスク:
- 読みにくい

対策:
1. 表示項目の ON/OFF 設定
2. 重要度順表示
3. 2 行目・3 行目の情報密度制御

## 35.3 保存件数増加

リスク:
- 描画遅延

対策:
1. ソート前処理の最適化
2. 画像 lazy load
3. 将来仮想リスト導入余地

---

# 36. 将来版への拡張設計メモ

1. 価格履歴テーブル追加
2. タグ集約ビュー
3. カテゴリ別ビュー
4. sidePanel 常時表示
5. 既存タブとのリアルタイム同期
6. 複数リスト
7. App Store 以外への parser 拡張
8. 共有用 readonly HTML export

---

# 37. 完成条件

本拡張機能は、以下を満たした時点で仕様適合実装とみなす。

1. App Store アプリ詳細ページにおいて、対象位置または安全なフォールバック位置へ追加ボタンを表示できる
2. 追加したアプリが popup で一覧表示される
3. 重複追加を防止できる
4. 削除ができる
5. ストレージ永続化が機能する
6. options で export/import と全件削除ができる
7. ページ構造が多少変化しても致命的停止しにくい
8. UI が App Store を想起させる整理された一覧体験を提供する

---

# 38. 実装着手用の最小タスク分解

1. manifest 作成
2. content script 雛形作成
3. appId 抽出実装
4. ページ判定実装
5. ボタン挿入実装
6. storage repository 実装
7. add/remove/getAll 実装
8. popup 一覧実装
9. popup 検索実装
10. popup ソート実装
11. popup 削除実装
12. options 実装
13. export/import 実装
14. MutationObserver 実装
15. トースト実装
16. エラーハンドリング実装
17. テスト作成
18. アイコン作成
19. Chrome ロード確認
20. 手動受け入れ試験

---

# 39. 補足設計判断

1. ページ上ボタン位置は「隣」を第一目標とするが、DOM 差異に備えて厳密なピクセル一致は要求しない
2. 保存キーは URL ではなく appId を原則とする
3. popup は閲覧・軽管理、options は詳細管理に役割分離する
4. UI は Apple 風の清潔感を目指すが、意匠コピーはしない
5. 収益化・同期・通知を切り離すことで、ローカル完結の堅牢な MVP を優先する

---

# 40. この仕様書に基づく初期実装の優先順位

優先度 A:
1. ページ判定
2. appId 抽出
3. ボタン挿入
4. 保存
5. popup 一覧

優先度 B:
1. 検索
2. ソート
3. 削除
4. options
5. import/export

優先度 C:
1. メモ
2. タグ
3. 評価表示
4. カテゴリ表示
5. 詳細な異常系磨き込み

以上

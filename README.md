# e-Learning Platform (MVP)

リスキリング対応のe-Learningプラットフォーム MVP版

## 📋 概要

- **技術スタック**: Turborepo / Next.js 15 / Cloudflare Workers (Hono) / D1 / Clerk
- **対象機能**: 認証・コース管理・動画配信・決済・学習進捗管理・講師機能・運営管理
- **開発期間**: 約5ヶ月（21週間）
- **画面数**: 40画面

## 🏗️ プロジェクト構造

```
webapp/
├── apps/
│   ├── web/          # 受講者・講師向けフロントエンド (Next.js)
│   └── admin/        # 運営管理画面 (Next.js)
├── packages/
│   ├── api/          # バックエンドAPI (Hono + Cloudflare Workers)
│   ├── database/     # データベーススキーマ (Drizzle + D1)
│   ├── shared/       # 共通型定義・ユーティリティ
│   └── ui/           # 共通UIコンポーネント
├── turbo.json        # Turborepo設定
└── package.json      # ルートワークスペース設定
```

## 🚀 セットアップ

### 前提条件

- Node.js >= 18.0.0
- npm >= 10.0.0
- Cloudflare アカウント
- Clerk アカウント

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集してAPIキーを設定
```

### 開発サーバーの起動

```bash
# 全アプリを起動
npm run dev

# Webアプリのみ起動 (ポート 3000)
npm run dev:web

# 管理画面のみ起動 (ポート 3001)
npm run dev:admin

# APIのみ起動 (ポート 8787)
npm run dev:api
```

## 📦 パッケージ詳細

### apps/web
受講者・講師向けのメインアプリケーション
- コース閲覧・購入
- 動画視聴
- 学習進捗管理
- 講師ダッシュボード

### apps/admin
運営管理者向けダッシュボード
- ユーザー管理
- コース審査
- 売上レポート
- システム設定

### packages/api
Cloudflare Workers上で動作するAPIサーバー
- Hono フレームワーク
- 認証・認可ミドルウェア
- RESTful API エンドポイント

### packages/database
データベース関連
- Drizzle ORM スキーマ定義
- D1 マイグレーション

### packages/shared
共通モジュール
- TypeScript 型定義
- ユーティリティ関数
- 定数定義

### packages/ui
共有UIコンポーネント
- Button, Card, Input, Badge, Avatar
- shadcn/ui ベース

## 🔧 開発コマンド

```bash
# ビルド
npm run build

# Lint
npm run lint

# 型チェック
npm run typecheck

# フォーマット
npm run format

# DBマイグレーション生成
npm run db:generate

# DBマイグレーション実行
npm run db:migrate
```

## 📅 開発フェーズ

| Phase | 内容 | 期間 |
|-------|------|------|
| 0 | 環境構築 | 2週間 |
| 1 | 認証・認可 | 2週間 |
| 2 | コース管理 | 3週間 |
| 3 | 動画配信 | 3週間 |
| 4 | 決済 | 2週間 |
| 5 | 学習機能 | 2週間 |
| 6 | 講師機能 | 2週間 |
| 7 | 運営管理 | 2週間 |
| 8 | テスト | 2週間 |
| 9 | リリース準備 | 1週間 |

## 🔐 環境変数

`.env.example` を参照してください。主な設定項目:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk公開キー
- `CLERK_SECRET_KEY` - Clerkシークレットキー
- `CLOUDFLARE_*` - Cloudflare D1/R2設定
- `STRIPE_*` - Stripe決済設定 (Phase 4以降)

## 📚 設計ドキュメント

以下の設計書に基づいて開発:

- 動画要件定義.rtf - MVP機能要件
- システムアーキテクチャ.rtf - システム構成
- API設計.rtf - APIエンドポイント設計
- 動画配信設計.rtf - HLS配信・暗号化
- 認証認可設計.rtf - Clerk連携・ロール管理
- UI/UX.rtf - デザインシステム
- データベース設計１.rtf - D1スキーマ設計

## 📝 ライセンス

Private - FutureClock Inc.

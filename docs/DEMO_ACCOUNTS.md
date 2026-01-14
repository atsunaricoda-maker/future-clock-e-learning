# デモアカウント情報

e-Learningプラットフォームのテスト・デモ用アカウント一覧です。

## アカウント一覧

### 受講生（Student）アカウント
| 項目 | 値 |
|------|-----|
| **メールアドレス** | `student@demo.example.com` |
| **パスワード** | `Demo1234!` |
| **ロール** | student |
| **利用可能な機能** | コース閲覧、購入、学習、進捗管理、修了証取得、Q&A、レビュー投稿 |

### 講師（Instructor）アカウント
| 項目 | 値 |
|------|-----|
| **メールアドレス** | `instructor@demo.example.com` |
| **パスワード** | `Demo1234!` |
| **ロール** | instructor |
| **利用可能な機能** | コース作成・編集、動画アップロード、収益管理、生徒管理、Q&A回答、クーポン作成 |

### 管理者（Admin）アカウント
| 項目 | 値 |
|------|-----|
| **メールアドレス** | `admin@demo.example.com` |
| **パスワード** | `Demo1234!` |
| **ロール** | admin |
| **利用可能な機能** | ユーザー管理、コース承認/却下、全体統計閲覧、システム設定 |

## セットアップ手順

### 1. アカウント作成（初回のみ）

APIを通じてアカウントを作成します：

```bash
# 受講生アカウント
curl -X POST https://elearning-api.atsunari-coda.workers.dev/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@demo.example.com","password":"Demo1234!","name":"学習太郎"}'

# 講師アカウント
curl -X POST https://elearning-api.atsunari-coda.workers.dev/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@demo.example.com","password":"Demo1234!","name":"講師花子"}'

# 管理者アカウント
curl -X POST https://elearning-api.atsunari-coda.workers.dev/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.example.com","password":"Demo1234!","name":"管理次郎"}'
```

### 2. ロールの設定

デモアカウントのロールを設定するには、以下のセットアップエンドポイントを使用します：

```bash
curl -X POST https://elearning-api.atsunari-coda.workers.dev/setup-demo-accounts \
  -H "X-Setup-Key: demo-setup-2024"
```

または、Wrangler D1 CLIを使用してDBを直接更新：

```bash
# 講師ロールに変更
npx wrangler d1 execute video-platform-production --remote \
  --command "UPDATE el_users SET role = 'instructor' WHERE email = 'instructor@demo.example.com'"

# 管理者ロールに変更
npx wrangler d1 execute video-platform-production --remote \
  --command "UPDATE el_users SET role = 'admin' WHERE email = 'admin@demo.example.com'"
```

## ログイン方法

### Web UI経由
1. https://[your-domain]/sign-in にアクセス
2. メールアドレスとパスワードを入力
3. 「ログイン」ボタンをクリック

### API経由
```bash
curl -X POST https://elearning-api.atsunari-coda.workers.dev/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@demo.example.com","password":"Demo1234!"}'
```

レスポンス例：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "xxx",
      "email": "student@demo.example.com",
      "name": "学習太郎",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 各ロールで利用可能なページ

### 受講生（Student）
- `/dashboard` - ダッシュボード
- `/courses` - コース一覧
- `/courses/[id]` - コース詳細
- `/courses/[id]/learn/[lectureId]` - 学習ページ
- `/dashboard/certificates` - 修了証一覧
- `/wishlist` - ウィッシュリスト
- `/profile` - プロフィール

### 講師（Instructor）
上記に加えて：
- `/instructor` - 講師ダッシュボード
- `/instructor/courses` - マイコース管理
- `/instructor/courses/new` - 新規コース作成
- `/instructor/courses/[id]` - コース編集
- `/instructor/analytics` - 分析
- `/instructor/revenue` - 収益レポート
- `/instructor/questions` - Q&A管理
- `/instructor/coupons` - クーポン管理
- `/instructor/videos` - 動画管理

### 管理者（Admin）
上記に加えて：
- `/admin` - 管理者ダッシュボード
- `/admin/users` - ユーザー管理
- `/admin/courses` - コース管理
- `/admin/course-reviews` - コース審査
- `/admin/revenue` - 収益概要

## 注意事項

- これらはデモ・テスト用のアカウントです
- 本番環境では別途セキュアなアカウントを使用してください
- パスワードは定期的に変更することを推奨します
- デモアカウントで作成したデータは予告なく削除される場合があります

## トラブルシューティング

### ログインできない場合
1. メールアドレスとパスワードが正しいか確認
2. アカウントが作成されているか確認
3. ロールが正しく設定されているか確認

### 権限エラーが出る場合
1. ログアウトして再ログイン
2. ブラウザのキャッシュ/Cookieをクリア
3. ロールが正しく設定されているか確認

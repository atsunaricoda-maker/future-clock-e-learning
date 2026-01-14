# おすすめ追加実装案

**作成日**: 2026-01-14  
**ステータス**: 提案中  

---

## エグゼクティブサマリー

現状のMVP達成率は約90%です。残りの10%と、ユーザー体験を大幅に向上させる機能を優先度・工数・ビジネスインパクトの観点から評価し、**即座に実装すべき5つの機能**を提案します。

---

## 🎯 おすすめ実装 TOP 5

### 1. プレビュー動画機能 (推奨度: ⭐⭐⭐⭐⭐)

**なぜ重要か**
- コンバージョン率向上の最も効果的な施策
- 要件定義書6.3で「各コース1本以上必須」と明記
- DBに `promo_video_url` カラムが既に存在

**実装内容**
```
コース詳細ページ（/courses/[id]）のヒーローエリアに
プレビュー動画再生機能を追加
```

**工数見積もり**: 0.5日  
**変更ファイル**: 
- `apps/web/src/app/courses/[id]/page.tsx`

**実装詳細**:
1. コース情報に `promoVideoUrl` を追加
2. サムネイル画像クリックでモーダル動画再生
3. 未購入ユーザーにも表示（購入促進）

---

### 2. 講師側コース審査申請機能 (推奨度: ⭐⭐⭐⭐⭐)

**なぜ重要か**
- 管理者用審査ページは存在するが、講師からの申請UIがない
- コース公開フローが完成しない
- 講師体験の重大な欠落

**実装内容**
```
講師のコース編集ページに「審査に提出」ボタンを追加
ステータス表示とフィードバック機能
```

**工数見積もり**: 1日  
**変更ファイル**:
- `apps/web/src/app/instructor/courses/[id]/page.tsx` (設定タブ強化)
- `packages/api/src/routes/instructor.ts` (審査申請エンドポイント)

**実装詳細**:
1. コースステータス: draft → pending_review への変更API
2. 「審査に提出」ボタン（条件: 動画が1つ以上、価格設定済み）
3. 審査却下時の理由表示
4. 再申請機能

---

### 3. 動画プレイヤー字幕対応 (推奨度: ⭐⭐⭐⭐)

**なぜ重要か**
- アクセシビリティ向上（法的要件を満たす）
- 要件定義書6.2で明記
- 学習効果向上（非ネイティブ話者、聴覚障害者）

**実装内容**
```
SRT/VTT字幕ファイルのアップロード・表示機能
動画プレイヤーに字幕ON/OFFトグル追加
```

**工数見積もり**: 2日  
**変更ファイル**:
- `packages/database/migrations/` (新規: 字幕テーブル)
- `packages/api/src/routes/videos.ts` (字幕CRUD API)
- `apps/web/src/components/video/VideoPlayer.tsx` (字幕表示)
- `apps/web/src/app/instructor/courses/[id]/page.tsx` (字幕アップロードUI)

**DB追加**:
```sql
CREATE TABLE el_video_subtitles (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES el_videos(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ja',
  label TEXT NOT NULL DEFAULT '日本語',
  vtt_url TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### 4. コース進捗グラフUI (推奨度: ⭐⭐⭐⭐)

**なぜ重要か**
- 学習モチベーション維持
- 完了率向上（進捗の可視化）
- ダッシュボードの魅力向上

**実装内容**
```
受講者ダッシュボードにコース進捗の円グラフ・棒グラフを追加
学習時間の推移グラフ
```

**工数見積もり**: 1日  
**変更ファイル**:
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/courses/page.tsx`
- 新規: `apps/web/src/components/dashboard/ProgressChart.tsx`

**実装詳細**:
1. Chart.js または Recharts を使用
2. コース別進捗率（円グラフ）
3. 週間学習時間（棒グラフ）
4. 連続学習日数表示

---

### 5. 講師分析ダッシュボード強化 (推奨度: ⭐⭐⭐)

**なぜ重要か**
- 講師のエンゲージメント向上
- データドリブンなコース改善
- 収益化モチベーション

**実装内容**
```
講師ダッシュボードにKPIカード・グラフを追加
受講者分析、売上推移、人気レクチャーランキング
```

**工数見積もり**: 1.5日  
**変更ファイル**:
- `apps/web/src/app/instructor/page.tsx`
- `apps/web/src/app/instructor/analytics/page.tsx`
- `packages/api/src/routes/instructor.ts` (分析API追加)

**実装詳細**:
1. 週間/月間売上グラフ
2. 新規受講者数推移
3. レビュー評価分布
4. 離脱率の高いレクチャー特定

---

## 📊 実装優先度マトリックス

| 機能 | 工数 | インパクト | 技術難易度 | 優先度 |
|------|------|-----------|-----------|--------|
| プレビュー動画 | 0.5日 | 高 | 低 | 🔴 P0 |
| 審査申請機能 | 1日 | 高 | 低 | 🔴 P0 |
| 字幕対応 | 2日 | 中 | 中 | 🟡 P1 |
| 進捗グラフ | 1日 | 中 | 低 | 🟡 P1 |
| 講師分析強化 | 1.5日 | 中 | 低 | 🟢 P2 |

**総工数**: 約6日（1人月の30%）

---

## 🚀 推奨実装順序

### Phase A: 即座に実装（1-2日）
1. **プレビュー動画機能** - 最小工数で最大効果
2. **講師審査申請機能** - コース公開フロー完成

### Phase B: 今週中（3-4日）
3. **字幕対応** - アクセシビリティ＆品質向上
4. **進捗グラフUI** - 学習体験向上

### Phase C: 来週（1-2日）
5. **講師分析強化** - 講師エンゲージメント

---

## 💡 実装コード例

### 1. プレビュー動画（コース詳細ページ）

```tsx
// apps/web/src/app/courses/[id]/page.tsx への追加

// Interface追加
interface Course {
  // ... 既存フィールド
  promoVideoUrl?: string;  // 追加
}

// ヒーローセクション内 (line 367-377付近を修正)
<div className="aspect-video bg-muted relative">
  {course.promoVideoUrl ? (
    <PreviewVideoModal videoUrl={course.promoVideoUrl} thumbnailUrl={course.thumbnailUrl}>
      <div className="relative cursor-pointer group">
        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 group-hover:bg-black/40 transition-colors">
          <div className="rounded-full bg-white p-4">
            <Play className="h-8 w-8 text-primary fill-primary" />
          </div>
        </div>
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          プレビューを見る
        </span>
      </div>
    </PreviewVideoModal>
  ) : (
    // 既存のサムネイル表示
  )}
</div>
```

### 2. 講師審査申請（設定タブ）

```tsx
// apps/web/src/app/instructor/courses/[id]/page.tsx の設定タブ

const handleSubmitForReview = async () => {
  if (!confirm('このコースを審査に提出しますか？')) return;
  
  try {
    const response = await api.submitCourseForReview(params.id as string);
    if (response.success) {
      setSuccessMessage('審査に提出しました。審査には通常1-3営業日かかります。');
      await loadCourse(params.id as string);
    } else {
      setError(response.error?.message || '審査申請に失敗しました');
    }
  } catch {
    setError('ネットワークエラーが発生しました');
  }
};

// 設定タブ内のUI
{course.status === 'draft' && (
  <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
    <div>
      <p className="font-medium text-blue-700">コースを公開する</p>
      <p className="text-sm text-blue-600">
        審査に提出すると、管理者が内容を確認します（1-3営業日）
      </p>
    </div>
    <Button 
      onClick={handleSubmitForReview}
      disabled={!canSubmitForReview}
      className="bg-blue-600 hover:bg-blue-700"
    >
      <Send className="h-4 w-4 mr-2" />
      審査に提出
    </Button>
  </div>
)}

{course.status === 'pending_review' && (
  <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200">
    <div>
      <p className="font-medium text-yellow-700 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        審査中
      </p>
      <p className="text-sm text-yellow-600">
        審査結果をお待ちください
      </p>
    </div>
  </div>
)}

{course.status === 'rejected' && (
  <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200">
    <div>
      <p className="font-medium text-red-700">審査が却下されました</p>
      <p className="text-sm text-red-600">
        却下理由: {course.rejectionReason || '品質基準を満たしていません'}
      </p>
    </div>
    <Button onClick={handleSubmitForReview} variant="outline" className="border-red-300">
      再申請する
    </Button>
  </div>
)}
```

### 3. 字幕対応（VideoPlayer）

```tsx
// apps/web/src/components/video/VideoPlayer.tsx への追加

interface Subtitle {
  language: string;
  label: string;
  vttUrl: string;
}

interface VideoPlayerProps {
  // ... 既存props
  subtitles?: Subtitle[];  // 追加
}

// video要素内に追加
<video ref={videoRef} src={src} poster={poster} className="w-full aspect-video">
  {subtitles?.map((sub) => (
    <track
      key={sub.language}
      kind="subtitles"
      src={sub.vttUrl}
      srcLang={sub.language}
      label={sub.label}
      default={sub.language === 'ja'}
    />
  ))}
</video>

// 字幕トグルボタン（コントロール内）
<button
  onClick={() => {
    const video = videoRef.current;
    if (video?.textTracks[0]) {
      video.textTracks[0].mode = 
        video.textTracks[0].mode === 'showing' ? 'hidden' : 'showing';
    }
  }}
  className="text-white hover:text-blue-400 transition-colors"
  title="字幕"
>
  <Subtitles className="h-5 w-5" />
</button>
```

---

## 📋 API追加仕様

### 審査申請API

```typescript
// POST /v1/instructor/courses/:id/submit-review
// Request: (body不要)
// Response:
{
  success: true,
  data: {
    courseId: string,
    status: 'pending_review',
    submittedAt: string
  }
}
```

### 字幕API

```typescript
// POST /v1/videos/:id/subtitles
// Request (multipart/form-data):
{
  file: File, // .srt or .vtt
  language: string,
  label: string
}

// GET /v1/videos/:id/subtitles
// Response:
{
  success: true,
  data: {
    subtitles: [
      { id, language, label, vttUrl, isDefault }
    ]
  }
}
```

---

## ✅ 次のステップ

1. **今すぐ**: プレビュー動画機能の実装開始
2. **本日中**: 審査申請機能のAPI・UI実装
3. **明日以降**: 字幕対応、進捗グラフの順次実装

**どの機能から実装を開始しますか？**

---

## 付録: 将来的な拡張候補

上記5つ完了後に検討する機能:

| 機能 | 工数 | フェーズ |
|------|------|----------|
| B2Cサブスクリプション | 5日 | Phase 2 |
| アフィリエイトプログラム | 5日 | Phase 2 |
| クイズ機能UI | 5日 | Phase 2 |
| オフライン研修予約 | 10日 | Phase 2 |
| YouTubeライブ埋め込み | 3日 | Phase 2 |

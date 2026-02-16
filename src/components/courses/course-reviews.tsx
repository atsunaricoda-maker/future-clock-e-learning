"use client";

import { useState } from "react";
import { submitReview, deleteReview } from "@/lib/actions/review";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string;
}

interface CourseReviewsProps {
  courseId: string;
  courseSlug: string;
  reviews: ReviewData[];
  currentUserId: string | null;
  userReview: ReviewData | null;
  isEnrolled: boolean;
}

function StarRating({
  rating,
  onChange,
  interactive = false,
}: {
  rating: number;
  onChange?: (r: number) => void;
  interactive?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
        >
          <Star
            className={`h-5 w-5 ${
              star <= (hover || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function CourseReviews({
  courseId,
  courseSlug,
  reviews,
  currentUserId,
  userReview,
  isEnrolled,
}: CourseReviewsProps) {
  const [rating, setRating] = useState(userReview?.rating ?? 0);
  const [comment, setComment] = useState(userReview?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(!!userReview);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("星評価を選択してください");
      return;
    }

    setLoading(true);
    try {
      const result = await submitReview(courseId, courseSlug, rating, comment);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(userReview ? "レビューを更新しました" : "レビューを投稿しました");
        setShowForm(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    const result = await deleteReview(reviewId, courseSlug);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("レビューを削除しました");
      setRating(0);
      setComment("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            レビュー
            {avgRating && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({avgRating} / 5.0 ・ {reviews.length}件)
              </span>
            )}
          </CardTitle>
          {isEnrolled && currentUserId && !showForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              {userReview ? "レビューを編集" : "レビューを書く"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Review form */}
        {showForm && currentUserId && (
          <div className="space-y-3 rounded-md border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">評価</p>
              <StarRating
                rating={rating}
                onChange={setRating}
                interactive
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">コメント（任意）</p>
              <Textarea
                placeholder="このコースについての感想を書いてください..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={loading} size="sm">
                {loading ? "送信中..." : userReview ? "更新する" : "投稿する"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}

        {/* Review list */}
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => {
              const initials = review.user_name
                ? review.user_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "?";

              return (
                <div key={review.id} className="flex gap-3 border-b pb-3 last:border-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {review.user_name}
                        </span>
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      {currentUserId === review.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(review.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !showForm && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              まだレビューがありません
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}

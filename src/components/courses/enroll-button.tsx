"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { enrollInCourse } from "@/lib/actions/enrollment";
import { toast } from "sonner";
import { Loader2, BookOpen, PlayCircle, Lock } from "lucide-react";

interface UnmetPrerequisite {
  id: string;
  title: string;
  slug: string;
}

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  isEnrolled: boolean;
  isLoggedIn: boolean;
  firstLessonId?: string | null;
  unmetPrerequisites?: UnmetPrerequisite[];
}

export function EnrollButton({
  courseId,
  courseSlug,
  isEnrolled,
  isLoggedIn,
  firstLessonId,
  unmetPrerequisites = [],
}: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isLoggedIn) {
    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => router.push("/login")}
      >
        <BookOpen className="mr-2 h-5 w-5" />
        ログインして受講する
      </Button>
    );
  }

  if (isEnrolled) {
    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => {
          if (firstLessonId) {
            router.push(`/courses/${courseSlug}/learn/${firstLessonId}`);
          } else {
            toast.info("レッスンがまだ追加されていません");
          }
        }}
      >
        <PlayCircle className="mr-2 h-5 w-5" />
        学習を続ける
      </Button>
    );
  }

  // Show prerequisites warning if not met
  if (unmetPrerequisites.length > 0) {
    return (
      <div className="space-y-3">
        <Button size="lg" className="w-full" disabled>
          <Lock className="mr-2 h-5 w-5" />
          前提条件未達
        </Button>
        <div className="rounded-md border border-yellow-200 bg-yellow-50/50 p-3">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            受講するには以下のコースを修了してください:
          </p>
          <ul className="space-y-1">
            {unmetPrerequisites.map((prereq) => (
              <li key={prereq.id}>
                <Link
                  href={`/courses/${prereq.slug}`}
                  className="text-sm text-primary hover:underline underline-offset-4"
                >
                  → {prereq.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const handleEnroll = async () => {
    setLoading(true);
    const result = await enrollInCourse(courseId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("コースに登録しました！");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleEnroll}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <BookOpen className="mr-2 h-5 w-5" />
      )}
      {loading ? "登録中..." : "受講登録する（無料）"}
    </Button>
  );
}

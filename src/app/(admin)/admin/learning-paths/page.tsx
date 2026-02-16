import { createClient } from "@/lib/supabase/server";
import { LearningPathManager } from "@/components/admin/learning-path-manager";

export default async function AdminLearningPathsPage() {
  const supabase = await createClient();

  const [pathsRes, coursesRes] = await Promise.all([
    supabase
      .from("learning_paths")
      .select(
        "id, title, slug, description, difficulty_level, is_published, learning_path_courses(course_id, order_index, is_required, courses(id, title))"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("courses")
      .select("id, title")
      .order("title"),
  ]);

  const learningPaths = (pathsRes.data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    difficulty_level: p.difficulty_level,
    is_published: p.is_published,
    courses: (p.learning_path_courses as unknown as {
      course_id: string;
      order_index: number;
      is_required: boolean;
      courses: { id: string; title: string } | null;
    }[]) ?? [],
  }));

  const allCourses = (coursesRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">学習パス管理</h1>
        <p className="text-muted-foreground">
          複数コースをまとめた学習パスを作成・管理します
        </p>
      </div>

      <LearningPathManager
        learningPaths={learningPaths}
        allCourses={allCourses}
      />
    </div>
  );
}

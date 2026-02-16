import { CourseForm } from "@/components/admin/course-form";
import { getActiveCategories } from "@/lib/actions/category";

export default async function CreateCoursePage() {
  const categories = await getActiveCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">コースを作成</h1>
        <p className="text-muted-foreground">
          新しいコースの基本情報を入力してください
        </p>
      </div>
      <CourseForm categories={categories} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CourseForm } from "@/components/admin/course-form";
import { CourseContentEditor } from "@/components/admin/course-content-editor";
import { PrerequisiteEditor } from "@/components/admin/prerequisite-editor";
import { getActiveCategories } from "@/lib/actions/category";
import { getPrerequisites } from "@/lib/actions/prerequisite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (!course) notFound();

  const [categories, currentPrerequisites] = await Promise.all([
    getActiveCategories(),
    getPrerequisites(id),
  ]);

  const [sectionsRes, allCoursesRes] = await Promise.all([
    supabase
      .from("sections")
      .select("*, lessons(*)")
      .eq("course_id", id)
      .order("order_index")
      .order("order_index", { referencedTable: "lessons" }),
    supabase
      .from("courses")
      .select("id, title")
      .neq("id", id)
      .order("title"),
  ]);

  const sections = sectionsRes.data;
  const allCourses = (allCoursesRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
  }));
  const currentPrerequisiteIds = currentPrerequisites.map((p) => p.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">コースを編集</h1>
          <p className="text-muted-foreground">{course.title}</p>
        </div>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="content">コンテンツ</TabsTrigger>
          <TabsTrigger value="prerequisites">前提条件</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="mt-6">
          <CourseForm initialData={course} categories={categories} />
        </TabsContent>
        <TabsContent value="content" className="mt-6">
          <CourseContentEditor
            courseId={id}
            initialSections={sections ?? []}
          />
        </TabsContent>
        <TabsContent value="prerequisites" className="mt-6">
          <PrerequisiteEditor
            courseId={id}
            allCourses={allCourses}
            currentPrerequisiteIds={currentPrerequisiteIds}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

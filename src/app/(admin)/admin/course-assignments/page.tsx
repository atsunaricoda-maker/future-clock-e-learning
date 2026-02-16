import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BulkCourseAssignment } from "@/components/admin/bulk-course-assignment";

export default async function CourseAssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [coursesRes, companiesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, status")
      .eq("status", "published")
      .order("title"),
    supabase
      .from("companies")
      .select("id, name, is_active")
      .order("name"),
    supabase
      .from("company_courses")
      .select("company_id, course_id"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">コース一括割当</h1>
        <p className="text-muted-foreground">
          複数のコースを複数の企業に一括で割り当てます
        </p>
      </div>

      <BulkCourseAssignment
        courses={coursesRes.data ?? []}
        companies={companiesRes.data ?? []}
        existingAssignments={assignmentsRes.data ?? []}
      />
    </div>
  );
}

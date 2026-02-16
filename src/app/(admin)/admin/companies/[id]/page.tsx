import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CompanyForm } from "@/components/admin/company-form";
import { CompanyCourseManager } from "@/components/admin/company-course-manager";
import { BulkEnrollmentUploader } from "@/components/admin/bulk-enrollment-uploader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Company } from "@/types/database";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [companyResult, assignedResult, allCoursesResult] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).single(),
    supabase
      .from("company_courses")
      .select("id, course_id, assigned_at, expires_at, courses(id, title, status)")
      .eq("company_id", id)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("courses")
      .select("id, title")
      .eq("status", "published")
      .order("title"),
  ]);

  const company = companyResult.data;
  if (!company) notFound();

  const assignedCourses = (assignedResult.data ?? []).map((row: Record<string, unknown>) => {
    const course = row.courses as { id: string; title: string; status: string } | null;
    return {
      id: row.id as string,
      course_id: row.course_id as string,
      course_title: course?.title ?? "不明なコース",
      course_status: course?.status ?? "draft",
      assigned_at: row.assigned_at as string,
      expires_at: row.expires_at as string | null,
    };
  });

  const allCourses = (allCoursesResult.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
  }));

  const assignedCourseIds = new Set(assignedCourses.map((c) => c.course_id));
  const availableCourses = allCourses.filter(
    (c) => !assignedCourseIds.has(c.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/companies">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">企業を編集</h1>
          <p className="text-muted-foreground">{company.name}</p>
        </div>
      </div>
      <CompanyForm initialData={company as unknown as Company} />
      <CompanyCourseManager
        companyId={id}
        assignedCourses={assignedCourses}
        availableCourses={availableCourses}
      />
      <BulkEnrollmentUploader
        companyId={id}
        availableCourses={allCourses}
      />
    </div>
  );
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignCourseToCompany(
  companyId: string,
  courseId: string,
  expiresAt?: string | null
) {
  const supabase = await createClient();

  const { error } = await supabase.from("company_courses").insert({
    company_id: companyId,
    course_id: courseId,
    expires_at: expiresAt || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "このコースはすでに割り当て済みです" };
    }
    console.error("assignCourseToCompany error:", error);
    return { error: "コースの割り当てに失敗しました" };
  }

  revalidatePath(`/admin/companies/${companyId}`);
  return { error: null };
}

export async function bulkAssignCoursesToCompanies(
  courseIds: string[],
  companyIds: string[],
  expiresAt?: string | null
) {
  const supabase = await createClient();

  const rows = companyIds.flatMap((companyId) =>
    courseIds.map((courseId) => ({
      company_id: companyId,
      course_id: courseId,
      expires_at: expiresAt || null,
    }))
  );

  const { error } = await supabase
    .from("company_courses")
    .upsert(rows, { onConflict: "company_id,course_id", ignoreDuplicates: true });

  if (error) {
    console.error("bulkAssignCoursesToCompanies error:", error);
    return { error: "一括割り当てに失敗しました", assigned: 0 };
  }

  for (const companyId of companyIds) {
    revalidatePath(`/admin/companies/${companyId}`);
  }
  revalidatePath("/admin/course-assignments");
  return { error: null, assigned: rows.length };
}

export async function unassignCourseFromCompany(
  companyCourseId: string,
  companyId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("company_courses")
    .delete()
    .eq("id", companyCourseId);

  if (error) {
    console.error("unassignCourseFromCompany error:", error);
    return { error: "割り当て解除に失敗しました" };
  }

  revalidatePath(`/admin/companies/${companyId}`);
  return { error: null };
}

export async function updateCourseExpiration(
  companyCourseId: string,
  companyId: string,
  expiresAt: string | null
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("company_courses")
    .update({ expires_at: expiresAt || null })
    .eq("id", companyCourseId);

  if (error) {
    console.error("updateCourseExpiration error:", error);
    return { error: "有効期限の更新に失敗しました" };
  }

  revalidatePath(`/admin/companies/${companyId}`);
  return { error: null };
}

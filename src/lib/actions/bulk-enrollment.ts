"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/actions/notification";
import { sendEnrollmentEmail } from "@/lib/actions/email";

export type BulkEnrollmentRow = {
  email: string;
  courseId: string;
};

export type BulkEnrollmentResultRow = {
  email: string;
  courseTitle: string;
  status: "success" | "already_enrolled" | "user_not_found" | "course_not_found" | "error";
  message: string;
};

export type BulkEnrollmentResult = {
  results: BulkEnrollmentResultRow[];
  summary: {
    total: number;
    success: number;
    alreadyEnrolled: number;
    userNotFound: number;
    courseNotFound: number;
    errors: number;
  };
  error?: string;
};

export async function parseCsvContent(content: string): Promise<{
  rows: BulkEnrollmentRow[];
  errors: string[];
}> {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: ["CSVファイルが空です"] };
  }

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  const startIndex =
    firstLine.includes("email") || firstLine.includes("メール")
      ? 1
      : 0;

  const rows: BulkEnrollmentRow[] = [];
  const errors: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 2) {
      errors.push(`${i + 1}行目: カラムが不足しています（email, course_id が必要）`);
      continue;
    }

    const email = cols[0];
    const courseId = cols[1];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`${i + 1}行目: メールアドレスが無効です（${email}）`);
      continue;
    }

    if (!courseId) {
      errors.push(`${i + 1}行目: コースIDが空です`);
      continue;
    }

    rows.push({ email, courseId });
  }

  return { rows, errors };
}

export async function bulkEnrollUsers(
  companyId: string,
  rows: BulkEnrollmentRow[]
): Promise<BulkEnrollmentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      results: [],
      summary: { total: 0, success: 0, alreadyEnrolled: 0, userNotFound: 0, courseNotFound: 0, errors: 0 },
      error: "認証が必要です",
    };
  }

  // Pre-fetch all unique emails and course IDs for batch lookup
  const uniqueEmails = [...new Set(rows.map((r) => r.email))];
  const uniqueCourseIds = [...new Set(rows.map((r) => r.courseId))];

  // Batch lookup users by email within the company
  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("company_id", companyId)
    .in("email", uniqueEmails);

  const userMap = new Map(
    (users ?? []).map((u) => [u.email, { id: u.id, fullName: u.full_name }])
  );

  // Batch lookup courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .in("id", uniqueCourseIds);

  const courseMap = new Map(
    (courses ?? []).map((c) => [c.id, c.title])
  );

  const results: BulkEnrollmentResultRow[] = [];
  const summary = {
    total: rows.length,
    success: 0,
    alreadyEnrolled: 0,
    userNotFound: 0,
    courseNotFound: 0,
    errors: 0,
  };

  for (const row of rows) {
    const userInfo = userMap.get(row.email);
    const courseTitle = courseMap.get(row.courseId) ?? "";

    if (!userInfo) {
      results.push({
        email: row.email,
        courseTitle: courseTitle || row.courseId,
        status: "user_not_found",
        message: "この企業に所属するユーザーが見つかりません",
      });
      summary.userNotFound++;
      continue;
    }

    if (!courseTitle) {
      results.push({
        email: row.email,
        courseTitle: row.courseId,
        status: "course_not_found",
        message: "コースが見つかりません",
      });
      summary.courseNotFound++;
      continue;
    }

    // Insert enrollment
    const { error } = await supabase
      .from("enrollments")
      .insert({ user_id: userInfo.id, course_id: row.courseId });

    if (error) {
      if (error.code === "23505") {
        results.push({
          email: row.email,
          courseTitle,
          status: "already_enrolled",
          message: "すでに登録済みです",
        });
        summary.alreadyEnrolled++;
      } else {
        results.push({
          email: row.email,
          courseTitle,
          status: "error",
          message: "登録に失敗しました",
        });
        summary.errors++;
      }
      continue;
    }

    // Create notification
    await createNotification({
      userId: userInfo.id,
      type: "enrollment",
      title: "受講登録完了",
      message: `「${courseTitle}」への受講登録が完了しました。`,
      relatedUrl: "/my-courses",
    });

    // Send email (fire-and-forget)
    sendEnrollmentEmail({
      to: row.email,
      userName: userInfo.fullName ?? "受講生",
      courseTitle,
    });

    results.push({
      email: row.email,
      courseTitle,
      status: "success",
      message: "登録完了",
    });
    summary.success++;
  }

  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath("/company/members");
  revalidatePath("/my-courses");
  revalidatePath("/dashboard");

  return { results, summary };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInvitationEmail } from "./email";

export async function inviteMembers(
  emails: string[]
): Promise<{ results: { email: string; status: "sent" | "exists" | "error"; message: string }[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { results: emails.map((e) => ({ email: e, status: "error", message: "認証が必要です" })) };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id || !["admin", "company_admin"].includes(profile.role)) {
    return { results: emails.map((e) => ({ email: e, status: "error", message: "権限がありません" })) };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .single();

  const companyName = company?.name ?? "企業";
  const results: { email: string; status: "sent" | "exists" | "error"; message: string }[] = [];

  for (const email of emails) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) continue;

    // Check if user already exists in the company
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", trimmed)
      .eq("company_id", profile.company_id)
      .single();

    if (existing) {
      results.push({ email: trimmed, status: "exists", message: "すでに社員として登録済みです" });
      continue;
    }

    // Check if there's already a pending invitation
    const { data: pendingInvite } = await supabase
      .from("invitations")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("email", trimmed)
      .eq("status", "pending")
      .single();

    if (pendingInvite) {
      results.push({ email: trimmed, status: "exists", message: "招待済み（承認待ち）です" });
      continue;
    }

    try {
      // Create invitation record
      const { data: invitation, error: invError } = await supabase
        .from("invitations")
        .insert({
          company_id: profile.company_id,
          email: trimmed,
          invited_by: user.id,
        })
        .select("token")
        .single();

      if (invError) {
        console.error("invitation insert error:", invError);
        results.push({ email: trimmed, status: "error", message: "招待の作成に失敗しました" });
        continue;
      }

      // Send invitation email
      await sendInvitationEmail({
        to: trimmed,
        companyName,
        inviterName: profile.full_name ?? "企業管理者",
        token: invitation.token,
      });

      results.push({ email: trimmed, status: "sent", message: "招待メールを送信しました" });
    } catch (err) {
      console.error("invitation error:", err);
      results.push({ email: trimmed, status: "error", message: "招待に失敗しました" });
    }
  }

  revalidatePath("/company/members");
  return { results };
}

export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId)
    .eq("status", "pending");

  if (error) {
    console.error("cancelInvitation error:", error);
    return { error: "招待のキャンセルに失敗しました" };
  }

  revalidatePath("/company/members");
  return { error: null };
}

export async function acceptInvitation(token: string) {
  const admin = createAdminClient();

  // Look up invitation
  const { data: invitation, error: lookupError } = await admin
    .from("invitations")
    .select("id, company_id, email, status, expires_at")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (lookupError || !invitation) {
    return { error: "招待が見つからないか、すでに使用済みです" };
  }

  // Check expiration
  if (new Date(invitation.expires_at) < new Date()) {
    return { error: "この招待は期限切れです" };
  }

  // Check if user already exists
  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", invitation.email)
    .single();

  if (existingUser) {
    // User exists - just assign to company
    await admin
      .from("users")
      .update({ company_id: invitation.company_id, role: "student" })
      .eq("id", existingUser.id);

    await admin
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return { error: null, existingUser: true };
  }

  // Mark as accepted - user will be linked when they register
  await admin
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return { error: null, existingUser: false, email: invitation.email, companyId: invitation.company_id };
}

"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import type { NotificationPreferences } from "@/types/database";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@futureclock.jp";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

const defaultPreferences: NotificationPreferences = {
  email_enrollment: true,
  email_lesson_complete: false,
  email_quiz_result: false,
  email_certificate: true,
};

async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("notification_preferences")
    .eq("id", userId)
    .single();

  return (data?.notification_preferences as NotificationPreferences) ?? defaultPreferences;
}

export async function sendEnrollmentEmail({
  to,
  userName,
  courseTitle,
  userId,
}: {
  to: string;
  userName: string;
  courseTitle: string;
  userId?: string;
}) {
  try {
    if (userId) {
      const prefs = await getUserNotificationPreferences(userId);
      if (!prefs.email_enrollment) return;
    }

    await getResend().emails.send({
      from: `FutureClock LMS <${FROM_EMAIL}>`,
      to,
      subject: `【FutureClock】「${courseTitle}」への受講登録が完了しました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${userName}さん</h2>
          <p>「${courseTitle}」への受講登録が完了しました。</p>
          <p>マイコースページから学習を開始できます。</p>
          <p style="margin-top: 24px;">
            <a href="${APP_URL}/my-courses"
               style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              学習を始める
            </a>
          </p>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">FutureClock LMS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("sendEnrollmentEmail error:", error);
  }
}

export async function sendCertificateEmail({
  to,
  userName,
  courseTitle,
  certificateNumber,
  userId,
}: {
  to: string;
  userName: string;
  courseTitle: string;
  certificateNumber: string;
  userId?: string;
}) {
  try {
    if (userId) {
      const prefs = await getUserNotificationPreferences(userId);
      if (!prefs.email_certificate) return;
    }

    await getResend().emails.send({
      from: `FutureClock LMS <${FROM_EMAIL}>`,
      to,
      subject: `【FutureClock】「${courseTitle}」の修了証が発行されました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${userName}さん</h2>
          <p>おめでとうございます！「${courseTitle}」の修了証が発行されました。</p>
          <p>証明書番号: <strong>${certificateNumber}</strong></p>
          <p style="margin-top: 24px;">
            <a href="${APP_URL}/certificates"
               style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              修了証を確認する
            </a>
          </p>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">FutureClock LMS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("sendCertificateEmail error:", error);
  }
}

export async function sendInvitationEmail({
  to,
  companyName,
  inviterName,
  token,
}: {
  to: string;
  companyName: string;
  inviterName: string;
  token: string;
}) {
  try {
    const inviteUrl = `${APP_URL}/invite/${token}`;

    await getResend().emails.send({
      from: `FutureClock LMS <${FROM_EMAIL}>`,
      to,
      subject: `【FutureClock】${companyName}への招待`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>FutureClock LMSへの招待</h2>
          <p>${inviterName}さんから「${companyName}」への招待が届いています。</p>
          <p>下記のリンクをクリックして、招待を受け入れてください。</p>
          <p style="margin-top: 24px;">
            <a href="${inviteUrl}"
               style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              招待を受け入れる
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">
            この招待は7日間有効です。
          </p>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">FutureClock LMS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("sendInvitationEmail error:", error);
  }
}

export async function sendReminderEmail({
  to,
  userName,
  courseTitle,
  progressPercentage,
}: {
  to: string;
  userName: string;
  courseTitle: string;
  progressPercentage: number;
}) {
  try {
    await getResend().emails.send({
      from: `FutureClock LMS <${FROM_EMAIL}>`,
      to,
      subject: `【FutureClock】「${courseTitle}」の学習を続けましょう`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${userName}さん</h2>
          <p>「${courseTitle}」の学習はいかがですか？</p>
          <p>現在の進捗: <strong>${progressPercentage}%</strong></p>
          <p>少しずつでも学習を続けることで、スキルアップにつながります。</p>
          <p style="margin-top: 24px;">
            <a href="${APP_URL}/my-courses"
               style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              学習を再開する
            </a>
          </p>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">FutureClock LMS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("sendReminderEmail error:", error);
  }
}

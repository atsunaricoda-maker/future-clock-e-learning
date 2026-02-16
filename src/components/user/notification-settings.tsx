"use client";

import { useState } from "react";
import { updateNotificationPreferences } from "@/lib/actions/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { NotificationPreferences } from "@/types/database";

const defaultPreferences: NotificationPreferences = {
  email_enrollment: true,
  email_lesson_complete: false,
  email_quiz_result: false,
  email_certificate: true,
};

const settingsConfig = [
  {
    key: "email_enrollment" as const,
    label: "コース登録通知",
    description: "コースへの登録時にメールで通知",
  },
  {
    key: "email_lesson_complete" as const,
    label: "レッスン完了通知",
    description: "レッスンを完了した際にメールで通知",
  },
  {
    key: "email_quiz_result" as const,
    label: "クイズ結果通知",
    description: "クイズの結果をメールで通知",
  },
  {
    key: "email_certificate" as const,
    label: "修了証発行通知",
    description: "修了証が発行された際にメールで通知",
  },
];

interface NotificationSettingsProps {
  initialPreferences: NotificationPreferences | null;
}

export function NotificationSettings({
  initialPreferences,
}: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    initialPreferences ?? defaultPreferences
  );
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    setSaving(true);

    try {
      const result = await updateNotificationPreferences(updated);
      if (result.error) {
        toast.error(result.error);
        // Revert on error
        setPreferences(preferences);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">メール通知設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settingsConfig.map((setting) => (
          <div
            key={setting.key}
            className="flex items-center justify-between gap-4"
          >
            <div className="space-y-0.5">
              <Label htmlFor={setting.key} className="text-sm font-medium">
                {setting.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
            </div>
            <Switch
              id={setting.key}
              checked={preferences[setting.key]}
              onCheckedChange={() => handleToggle(setting.key)}
              disabled={saving}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

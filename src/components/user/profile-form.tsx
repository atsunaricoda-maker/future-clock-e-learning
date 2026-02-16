"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/lib/validations/profile";
import { updateProfile } from "@/lib/actions/profile";
import { AvatarUpload } from "@/components/user/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ProfileFormProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    company_name: string | null;
    created_at: string;
  };
}

const roleLabels: Record<string, string> = {
  admin: "管理者",
  company_admin: "企業管理者",
  student: "受講生",
};

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: user.full_name,
      avatar_url: user.avatar_url ?? "",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setLoading(true);
    try {
      const result = await updateProfile(values);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("プロフィールを更新しました");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">アカウント情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">メールアドレス</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ロール</p>
              <Badge variant="outline" className="mt-0.5">
                {roleLabels[user.role] ?? user.role}
              </Badge>
            </div>
            {user.company_name && (
              <div>
                <p className="text-sm text-muted-foreground">所属企業</p>
                <p className="text-sm font-medium">{user.company_name}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">登録日</p>
              <p className="text-sm font-medium">
                {new Date(user.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable profile */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">プロフィール編集</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>表示名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="名前を入力" {...field} />
                    </FormControl>
                    <FormDescription>
                      ヘッダーや修了証に表示される名前です
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>プロフィール画像</FormLabel>
                    <FormControl>
                      <AvatarUpload
                        userId={user.id}
                        currentUrl={field.value || null}
                        onUpload={(url) => field.onChange(url)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "更新する"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

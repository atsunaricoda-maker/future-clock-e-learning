"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  siteSettingsSchema,
  type SiteSettingsFormValues,
} from "@/lib/validations/site-settings";
import { updateSiteSettings } from "@/lib/actions/site-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

interface SiteSettingsFormProps {
  initialValues: SiteSettingsFormValues;
}

export function SiteSettingsForm({ initialValues }: SiteSettingsFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: SiteSettingsFormValues) => {
    setLoading(true);
    try {
      const result = await updateSiteSettings(values);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("設定を保存しました");
      }
    } catch {
      toast.error("設定の保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          教育訓練施設情報
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="organization_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>教育訓練施設名</FormLabel>
                  <FormControl>
                    <Input placeholder="例: 株式会社FutureClock" {...field} />
                  </FormControl>
                  <FormDescription>
                    修了証明書に記載される施設名です
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="representative_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>代表者名</FormLabel>
                  <FormControl>
                    <Input placeholder="例: 代表取締役 山田太郎" {...field} />
                  </FormControl>
                  <FormDescription>
                    修了証明書に記載される代表者名です
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organization_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所在地</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="例: 〒100-0001 東京都千代田区..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    修了証明書に記載される施設の所在地です
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存する
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { lessonFormSchema, type LessonFormValues } from "@/lib/validations/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoUpload } from "@/components/admin/video-upload";
import { isSupabaseVideoUrl } from "@/lib/video-utils";
import type { Lesson } from "@/types/database";

interface LessonFormProps {
  initialData?: Lesson;
  onSubmit: (values: LessonFormValues) => Promise<void>;
  loading?: boolean;
}

/**
 * 既存のcontent_urlからタブの初期値を判定
 */
function getInitialVideoTab(url?: string | null): string {
  if (!url) return "url";
  if (isSupabaseVideoUrl(url)) return "upload";
  return "url";
}

export function LessonForm({ initialData, onSubmit, loading }: LessonFormProps) {
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      type: initialData?.type ?? "video",
      content_url: initialData?.content_url ?? "",
      duration_seconds: initialData?.duration_seconds ?? undefined,
      is_preview: initialData?.is_preview ?? false,
    },
  });

  const lessonType = form.watch("type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>レッスン名 *</FormLabel>
              <FormControl>
                <Input placeholder="例: イントロダクション" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>種類</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="video">動画</SelectItem>
                  <SelectItem value="document">ドキュメント</SelectItem>
                  <SelectItem value="quiz">クイズ</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="レッスンの説明（任意）"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {lessonType === "video" && (
          <FormField
            control={form.control}
            name="content_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>動画ソース</FormLabel>
                <Tabs
                  defaultValue={getInitialVideoTab(initialData?.content_url)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">URL入力</TabsTrigger>
                    <TabsTrigger value="upload">ファイルアップロード</TabsTrigger>
                  </TabsList>

                  <TabsContent value="url" className="mt-3">
                    <FormControl>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={
                          !isSupabaseVideoUrl(field.value || "")
                            ? field.value || ""
                            : ""
                        }
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      YouTube、Vimeo等のURLを入力
                    </FormDescription>
                  </TabsContent>

                  <TabsContent value="upload" className="mt-3">
                    <VideoUpload
                      currentUrl={field.value || undefined}
                      onUploadComplete={(url) => {
                        field.onChange(url);
                      }}
                      onRemove={() => {
                        field.onChange("");
                      }}
                    />
                  </TabsContent>
                </Tabs>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {lessonType === "document" && (
          <FormField
            control={form.control}
            name="content_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ドキュメントURL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://example.com/document.pdf"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  PDF等のドキュメントURLを入力
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>所要時間（秒）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="例: 600"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === "" ? null : Number(val));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_preview"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 pt-8">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-input"
                  />
                </FormControl>
                <div>
                  <FormLabel className="!mt-0">プレビュー可能</FormLabel>
                  <FormDescription>未登録ユーザーも閲覧可</FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : initialData ? "更新する" : "追加する"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

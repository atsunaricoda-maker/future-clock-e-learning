"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  questionFormSchema,
  type QuestionFormValues,
} from "@/lib/validations/quiz";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Trash2 } from "lucide-react";
import type { Question } from "@/types/database";

interface QuestionFormProps {
  initialData?: Question;
  onSubmit: (values: QuestionFormValues) => Promise<void>;
  loading?: boolean;
}

function generateOptionId() {
  return crypto.randomUUID().slice(0, 8);
}

export function QuestionForm({
  initialData,
  onSubmit,
  loading,
}: QuestionFormProps) {
  const defaultTrueFalseOptions = [
    { id: generateOptionId(), text: "正しい" },
    { id: generateOptionId(), text: "間違い" },
  ];

  const defaultMultipleChoiceOptions = [
    { id: generateOptionId(), text: "" },
    { id: generateOptionId(), text: "" },
    { id: generateOptionId(), text: "" },
    { id: generateOptionId(), text: "" },
  ];

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      type: initialData?.type ?? "multiple_choice",
      text: initialData?.text ?? "",
      options: initialData?.options ?? defaultMultipleChoiceOptions,
      correct_answer_id: initialData?.correct_answer?.id ?? "",
      explanation: initialData?.explanation ?? "",
      points: initialData?.points ?? 1,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const questionType = form.watch("type");

  // When switching type, reset options
  useEffect(() => {
    if (!initialData) {
      if (questionType === "true_false") {
        replace(defaultTrueFalseOptions);
        form.setValue("correct_answer_id", "");
      } else {
        replace(defaultMultipleChoiceOptions);
        form.setValue("correct_answer_id", "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionType]);

  const handleAddOption = () => {
    append({ id: generateOptionId(), text: "" });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>問題タイプ</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="multiple_choice">選択式</SelectItem>
                    <SelectItem value="true_false">○×式</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>配点</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>問題文 *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="問題文を入力してください"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Options */}
        <div className="space-y-3">
          <FormLabel>選択肢</FormLabel>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="correct_answer_id"
                render={({ field: radioField }) => (
                  <input
                    type="radio"
                    name="correct_answer"
                    value={form.getValues(`options.${index}.id`)}
                    checked={
                      radioField.value ===
                      form.getValues(`options.${index}.id`)
                    }
                    onChange={() =>
                      radioField.onChange(
                        form.getValues(`options.${index}.id`)
                      )
                    }
                    className="h-4 w-4 shrink-0"
                    title="正解を選択"
                  />
                )}
              />
              <FormField
                control={form.control}
                name={`options.${index}.text`}
                render={({ field: textField }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder={`選択肢 ${index + 1}`}
                        {...textField}
                        disabled={questionType === "true_false"}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {questionType === "multiple_choice" && fields.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // If removing the correct answer, clear selection
                    const removedId = form.getValues(`options.${index}.id`);
                    if (form.getValues("correct_answer_id") === removedId) {
                      form.setValue("correct_answer_id", "");
                    }
                    remove(index);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <FormField
            control={form.control}
            name="correct_answer_id"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
          {questionType === "multiple_choice" && fields.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
            >
              <Plus className="mr-1 h-3 w-3" />
              選択肢を追加
            </Button>
          )}
        </div>

        <FormField
          control={form.control}
          name="explanation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>解説（任意）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="正解の解説を入力（受講生に表示されます）"
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : initialData ? "更新する" : "追加する"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

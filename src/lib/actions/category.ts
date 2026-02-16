"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, order_index, is_active")
    .order("order_index");
  return data ?? [];
}

export async function getActiveCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("order_index");
  return data ?? [];
}

export async function createCategory(values: {
  name: string;
  slug: string;
  description?: string;
}) {
  const supabase = await createClient();

  // Get max order_index
  const { data: maxRow } = await supabase
    .from("categories")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.order_index ?? 0) + 1;

  const { error } = await supabase.from("categories").insert({
    name: values.name,
    slug: values.slug,
    description: values.description || null,
    order_index: nextOrder,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "同じ名前またはスラッグのカテゴリが既に存在します" };
    }
    console.error("createCategory error:", error);
    return { error: "カテゴリの作成に失敗しました" };
  }

  revalidatePath("/admin/categories");
  return { error: null };
}

export async function updateCategory(
  id: string,
  values: { name: string; slug: string; description?: string; is_active: boolean }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      is_active: values.is_active,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "同じ名前またはスラッグのカテゴリが既に存在します" };
    }
    console.error("updateCategory error:", error);
    return { error: "カテゴリの更新に失敗しました" };
  }

  revalidatePath("/admin/categories");
  return { error: null };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("deleteCategory error:", error);
    return { error: "カテゴリの削除に失敗しました" };
  }

  revalidatePath("/admin/categories");
  return { error: null };
}

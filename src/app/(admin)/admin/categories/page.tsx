import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/category-manager";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, description, order_index, is_active")
    .order("order_index");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">カテゴリ管理</h1>
        <p className="text-muted-foreground">
          コースのカテゴリを作成・編集・削除します
        </p>
      </div>
      <CategoryManager initialCategories={categories ?? []} />
    </div>
  );
}

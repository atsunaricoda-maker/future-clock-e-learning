import { createClient } from "@/lib/supabase/server";
import { UserCreateForm } from "@/components/admin/user-create-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewUserPage() {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">ユーザーを作成</h1>
          <p className="text-muted-foreground">
            新しいユーザーアカウントを作成します
          </p>
        </div>
      </div>
      <UserCreateForm companies={companies ?? []} />
    </div>
  );
}

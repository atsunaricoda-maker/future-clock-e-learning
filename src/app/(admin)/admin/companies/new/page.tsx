import { CompanyForm } from "@/components/admin/company-form";

export default function CreateCompanyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">企業を作成</h1>
        <p className="text-muted-foreground">
          新しい企業の基本情報を入力してください
        </p>
      </div>
      <CompanyForm />
    </div>
  );
}

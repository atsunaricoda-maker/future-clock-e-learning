import { getOrganizationInfo } from "@/lib/actions/site-settings";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { Settings } from "lucide-react";

export default async function AdminSettingsPage() {
  const orgInfo = await getOrganizationInfo();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">設定</h1>
            <p className="text-sm text-muted-foreground">
              サイト全体の設定を管理します
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <SiteSettingsForm
          initialValues={{
            organization_name: orgInfo.organization_name,
            representative_name: orgInfo.representative_name,
            organization_address: orgInfo.organization_address,
          }}
        />
      </div>
    </div>
  );
}

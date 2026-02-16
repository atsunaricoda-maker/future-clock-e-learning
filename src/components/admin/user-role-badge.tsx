import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/database";

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  admin: {
    label: "管理者",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  company_admin: {
    label: "企業管理者",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  student: {
    label: "受講生",
    className: "",
  },
};

export function UserRoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role] ?? roleConfig.student;
  return (
    <Badge variant={role === "student" ? "secondary" : "default"} className={config.className}>
      {config.label}
    </Badge>
  );
}

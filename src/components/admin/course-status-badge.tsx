import { Badge } from "@/components/ui/badge";

const statusConfig = {
  draft: { label: "下書き", variant: "secondary" as const },
  published: { label: "公開中", variant: "default" as const },
  archived: { label: "アーカイブ", variant: "outline" as const },
};

export function CourseStatusBadge({
  status,
}: {
  status: "draft" | "published" | "archived";
}) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

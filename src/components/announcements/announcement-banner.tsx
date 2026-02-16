import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Pin,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_pinned: boolean;
  published_at: string;
}

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

const typeConfig: Record<
  string,
  {
    icon: typeof Info;
    borderColor: string;
    bgColor: string;
    iconColor: string;
    label: string;
  }
> = {
  info: {
    icon: Info,
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50/50",
    iconColor: "text-blue-600",
    label: "お知らせ",
  },
  warning: {
    icon: AlertTriangle,
    borderColor: "border-yellow-200",
    bgColor: "bg-yellow-50/50",
    iconColor: "text-yellow-600",
    label: "注意",
  },
  success: {
    icon: CheckCircle2,
    borderColor: "border-green-200",
    bgColor: "bg-green-50/50",
    iconColor: "text-green-600",
    label: "お祝い",
  },
  maintenance: {
    icon: Wrench,
    borderColor: "border-red-200",
    bgColor: "bg-red-50/50",
    iconColor: "text-red-600",
    label: "メンテナンス",
  },
};

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => {
        const config = typeConfig[announcement.type] ?? typeConfig.info;
        const Icon = config.icon;

        return (
          <Card
            key={announcement.id}
            className={`${config.borderColor} ${config.bgColor}`}
          >
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{announcement.title}</p>
                    {announcement.is_pinned && (
                      <Pin className="h-3 w-3 text-muted-foreground" />
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(announcement.published_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

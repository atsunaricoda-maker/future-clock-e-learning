import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

interface CertificateCardProps {
  id: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
}

export function CertificateCard({
  id,
  courseTitle,
  certificateNumber,
  issuedAt,
}: CertificateCardProps) {
  return (
    <Link href={`/certificates/${id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{courseTitle}</p>
            <p className="text-sm text-muted-foreground">
              証明書番号: {certificateNumber}
            </p>
          </div>
          <div className="text-right shrink-0">
            <Badge variant="secondary">修了</Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(issuedAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

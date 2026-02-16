import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CertificateCard } from "@/components/certificates/certificate-card";
import { Award } from "lucide-react";

export default async function CertificatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: certificates } = await supabase
    .from("certificates")
    .select("*, courses(title)")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">修了証明書</h1>
        <p className="text-muted-foreground">
          コースを修了すると証明書が自動発行されます
        </p>
      </div>

      {certificates && certificates.length > 0 ? (
        <div className="space-y-3">
          {certificates.map((cert) => {
            const course = cert.courses as unknown as { title: string } | null;
            return (
              <CertificateCard
                key={cert.id}
                id={cert.id}
                courseTitle={course?.title ?? "不明なコース"}
                certificateNumber={cert.certificate_number}
                issuedAt={cert.issued_at}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border p-12 text-center">
          <Award className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">
            まだ修了証明書がありません
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            コースを修了すると、ここに証明書が表示されます。
            <Link href="/courses" className="text-primary underline ml-1">
              コース一覧を見る
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

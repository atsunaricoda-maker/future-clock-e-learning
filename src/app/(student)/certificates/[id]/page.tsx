import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CertificateView } from "@/components/certificates/certificate-view";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: certificate } = await supabase
    .from("certificates")
    .select("*, courses(title), users(full_name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!certificate) notFound();

  const course = certificate.courses as unknown as { title: string } | null;
  const certUser = certificate.users as unknown as {
    full_name: string;
  } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/certificates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">修了証明書</h1>
          <p className="text-sm text-muted-foreground">
            {course?.title ?? "不明なコース"}
          </p>
        </div>
      </div>

      <CertificateView
        userName={certUser?.full_name ?? "受講生"}
        courseTitle={course?.title ?? "不明なコース"}
        certificateNumber={certificate.certificate_number}
        issuedAt={certificate.issued_at}
      />
    </div>
  );
}

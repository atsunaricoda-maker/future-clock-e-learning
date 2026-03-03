"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CertificateView } from "./certificate-view";

interface CertificateDetailWrapperProps {
  userName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  trainingStartDate?: string | null;
  trainingEndDate?: string | null;
  totalLearningMinutes?: number | null;
  organizationName?: string;
  representativeName?: string;
  organizationAddress?: string;
}

export function CertificateDetailWrapper(props: CertificateDetailWrapperProps) {
  return (
    <Tabs defaultValue="formal" className="print:hidden-tabs">
      <TabsList className="print:hidden">
        <TabsTrigger value="formal">教育訓練修了証明書</TabsTrigger>
        <TabsTrigger value="simple">修了証</TabsTrigger>
      </TabsList>

      <TabsContent value="formal">
        <CertificateView {...props} variant="formal" />
      </TabsContent>

      <TabsContent value="simple">
        <CertificateView {...props} variant="simple" />
      </TabsContent>
    </Tabs>
  );
}

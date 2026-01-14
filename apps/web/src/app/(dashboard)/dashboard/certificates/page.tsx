'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { 
  Award, 
  Download, 
  Share2, 
  ExternalLink,
  Loader2,
  Clock
} from 'lucide-react';

interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  thumbnailUrl?: string | null;
  issuedAt: string;
  certificateUrl: string;
}

export default function CertificatesPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [totalWatchTime, setTotalWatchTime] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      if (!hasToken) {
        window.location.href = '/sign-in?redirect=/dashboard/certificates';
      }
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCertificates();
      fetchLearningTime();
    }
  }, [isAuthenticated, user]);

  const fetchCertificates = async () => {
    try {
      const response = await api.getCertificates();
      if (response.success && response.data) {
        setCertificates(response.data.certificates);
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      setLoadingCerts(false);
    }
  };

  const fetchLearningTime = async () => {
    try {
      const response = await api.getLearningTimeLogs({});
      if (response.success && response.data) {
        setTotalWatchTime(response.data.totalDuration);
      }
    } catch (error) {
      console.error('Failed to fetch learning time:', error);
    }
  };

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
    }
    return `${minutes}分`;
  };

  const handleDownload = async (courseId: string) => {
    try {
      const response = await api.downloadCertificate(courseId);
      if (response.success && response.data) {
        // PDF生成のためのデータを使用してPDFを生成（クライアント側）
        // 実際の実装では、サーバー側でPDFを生成するか、
        // クライアント側でjspdfなどのライブラリを使用
        alert('修了証のダウンロード機能は準備中です');
      }
    } catch (error) {
      console.error('Failed to download certificate:', error);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">修了証</h1>
        <p className="text-muted-foreground">取得した修了証の一覧</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loadingCerts ? '-' : certificates.length}</p>
              <p className="text-sm text-muted-foreground">取得済み修了証</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatWatchTime(totalWatchTime)}</p>
              <p className="text-sm text-muted-foreground">総学習時間</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Download className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">助成金対応</p>
              <p className="text-sm text-muted-foreground">書類ダウンロード可</p>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate List */}
      {loadingCerts ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-card border rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Certificate Preview */}
                <div className="w-full md:w-64 h-44 bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg flex flex-col items-center justify-center p-4">
                  <Award className="h-12 w-12 text-yellow-600 mb-2" />
                  <p className="text-sm font-semibold text-center text-yellow-800">修了証</p>
                  <p className="text-xs text-yellow-600 text-center mt-1 line-clamp-2">{cert.courseTitle}</p>
                </div>

                {/* Certificate Details */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{cert.courseTitle}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-24">発行日</span>
                      <span>{new Date(cert.issuedAt).toLocaleDateString('ja-JP', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-24">認証ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{cert.id}</code>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" className="gap-2" onClick={() => handleDownload(cert.courseId)}>
                      <Download className="h-4 w-4" />
                      PDFダウンロード
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      共有
                    </Button>
                    <Link href={`/courses/${cert.courseId}`}>
                      <Button size="sm" variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        コースを見る
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingCerts && certificates.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">まだ修了証がありません</h3>
          <p className="text-muted-foreground mb-4">
            コースを完了すると修了証が発行されます
          </p>
        </div>
      )}

      {/* Subsidy Info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h3 className="font-semibold text-green-800 mb-2">助成金申請について</h3>
        <p className="text-sm text-green-700 mb-4">
          修了証と学習時間ログは、人材開発支援助成金の申請に使用できます。
          必要な書類は「PDFダウンロード」からダウンロードしてください。
        </p>
        <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
          助成金について詳しく見る
        </Button>
      </div>
    </div>
  );
}

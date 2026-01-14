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
  Clock,
  QrCode,
  Twitter,
  Linkedin,
  Copy,
  Check,
  X,
  FileText,
} from 'lucide-react';

interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  thumbnailUrl?: string | null;
  instructorName?: string;
  issuedAt: string;
  certificateUrl: string;
  completionRate?: number;
  totalWatchTime?: number;
}

export default function CertificatesPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleDownload = async (courseId: string, type: 'pdf' | 'learning_log' = 'pdf') => {
    try {
      const response = await api.downloadCertificate(courseId);
      if (response.success && response.data) {
        // PDFダウンロード処理
        // 実際にはサーバー側で生成されたPDFのURLにリダイレクト
        if (type === 'pdf') {
          alert('修了証PDFを生成中です...');
          // window.open(response.data.downloadUrl, '_blank');
        } else {
          alert('学習時間ログPDFを生成中です...');
        }
      }
    } catch (error) {
      console.error('Failed to download certificate:', error);
    }
  };

  const handleShare = (cert: Certificate) => {
    setSelectedCert(cert);
    setShowShareModal(true);
  };

  const getShareUrl = (cert: Certificate) => {
    return `${window.location.origin}/certificates/verify/${cert.id}`;
  };

  const handleCopyLink = async () => {
    if (selectedCert) {
      await navigator.clipboard.writeText(getShareUrl(selectedCert));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToTwitter = () => {
    if (selectedCert) {
      const text = `FutureClockで「${selectedCert.courseTitle}」を修了しました！🎉\n\n#FutureClock #オンライン学習 #修了証`;
      const url = getShareUrl(selectedCert);
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    }
  };

  const shareToLinkedIn = () => {
    if (selectedCert) {
      const url = getShareUrl(selectedCert);
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
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
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Certificate Preview */}
                <div className="w-full lg:w-72 h-52 bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-50 border-4 border-yellow-300 rounded-lg flex flex-col items-center justify-center p-4 relative shadow-lg">
                  {/* Decorative border */}
                  <div className="absolute inset-2 border-2 border-yellow-200 rounded pointer-events-none" />
                  <Award className="h-14 w-14 text-yellow-600 mb-2" />
                  <p className="text-lg font-bold text-yellow-800">修了証</p>
                  <p className="text-xs text-yellow-600 text-center mt-1 line-clamp-2 px-4">{cert.courseTitle}</p>
                  <p className="text-xs text-yellow-700 mt-2 font-medium">{user?.name}</p>
                  <p className="text-[10px] text-yellow-600 mt-1">
                    {new Date(cert.issuedAt).toLocaleDateString('ja-JP')}
                  </p>
                  {/* QR Code placeholder */}
                  <div className="absolute bottom-2 right-2">
                    <div className="w-10 h-10 bg-white p-1 rounded shadow">
                      <QrCode className="w-full h-full text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Certificate Details */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{cert.courseTitle}</h3>
                  {cert.instructorName && (
                    <p className="text-sm text-muted-foreground mb-2">
                      講師: {cert.instructorName}
                    </p>
                  )}
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
                      <span className="text-muted-foreground w-24">受講者名</span>
                      <span>{user?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-24">認証ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{cert.id}</code>
                    </div>
                    {cert.totalWatchTime && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-24">学習時間</span>
                        <span>{formatWatchTime(cert.totalWatchTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Verification Info */}
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-blue-700">
                      <QrCode className="h-4 w-4 inline mr-1" />
                      この修了証はQRコードまたは認証IDで検証可能です
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" className="gap-2" onClick={() => handleDownload(cert.courseId, 'pdf')}>
                      <Download className="h-4 w-4" />
                      修了証PDF
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => handleDownload(cert.courseId, 'learning_log')}>
                      <FileText className="h-4 w-4" />
                      学習記録PDF
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => handleShare(cert)}>
                      <Share2 className="h-4 w-4" />
                      SNSで共有
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
          <Link href="/courses">
            <Button>コースを探す</Button>
          </Link>
        </div>
      )}

      {/* Subsidy Info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h3 className="font-semibold text-green-800 mb-2">助成金申請について</h3>
        <p className="text-sm text-green-700 mb-4">
          修了証と学習時間ログは、人材開発支援助成金の申請に使用できます。
          必要な書類は「学習記録PDF」からダウンロードしてください。
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/subsidy">
            <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
              助成金について詳しく見る
            </Button>
          </Link>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowShareModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">修了証を共有</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowShareModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              「{selectedCert.courseTitle}」の修了証を共有しましょう！
            </p>

            {/* Share URL */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">共有リンク</label>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border truncate">
                  {getShareUrl(selectedCert)}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Social Share */}
            <div className="space-y-2">
              <label className="text-sm font-medium">SNSで共有</label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={shareToTwitter}
                >
                  <Twitter className="h-4 w-4" />
                  X (Twitter)
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={shareToLinkedIn}
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Button>
              </div>
            </div>

            {/* QR Code Preview */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white p-2 rounded border">
                  <QrCode className="w-full h-full text-gray-400" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">QRコードで検証</p>
                  <p className="text-muted-foreground">
                    修了証に記載のQRコードをスキャンすると、
                    この修了証が正規のものか確認できます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

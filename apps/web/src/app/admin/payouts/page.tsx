'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  TrendingUp,
  FileText,
  Send,
  Edit,
  X,
  Check,
  ShoppingCart,
  CreditCard,
  Calculator,
  Calendar,
  Info,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';

interface InstructorPayout {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  // PPV収益
  ppvTotalSales: number;
  ppvPlatformFee: number;
  ppvNetPayout: number;
  ppvTransactionCount: number;
  // パッケージ収益
  packageTotalSales: number;
  packagePlatformFee: number;
  packageNetPayout: number;
  packageTransactionCount: number;
  // サブスクリプション分配
  subscriptionShare: number;
  subscriptionStudentCount: number;
  // 合計
  totalSales: number;
  platformFee: number;
  commissionRate: number;
  netPayout: number;
  pendingBalance: number;
  paidAmount: number;
  lastPayoutDate: string | null;
  payoutStatus: string;
  bankAccount?: {
    bankName: string;
    branchName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

// 流入経路タイプ
type AcquisitionSourceType = 'instructor_referral' | 'platform' | 'affiliate';

interface PPVTransaction {
  id: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail?: string;
  buyerName: string;
  buyerEmail: string;
  salePrice: number;
  platformFee: number;
  instructorPayout: number;
  commissionRate: number;
  acquisitionSource: AcquisitionSourceType; // 流入経路
  affiliateId?: string;
  affiliateName?: string;
  affiliatePayout?: number;
  paymentStatus: string;
  purchasedAt: string;
  isPaid: boolean;
  paidAt: string | null;
}

interface PackageCourse {
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  listPrice: number;
  priceRatio: number;
  allocatedAmount: number;
  platformFee: number;
  instructorPayout: number;
  acquisitionSource: AcquisitionSourceType; // 流入経路（PPVと同様のルール適用）
  affiliatePayout?: number;
}

interface PackageTransaction {
  id: string;
  packageId: string;
  packageName: string;
  buyerName: string;
  buyerEmail: string;
  salePrice: number;
  discount: number;
  originalTotal: number;
  courses: PackageCourse[];
  acquisitionSource: AcquisitionSourceType; // 流入経路
  affiliateId?: string;
  affiliateName?: string;
  paymentStatus: string;
  purchasedAt: string;
  isPaid: boolean;
  paidAt: string | null;
}

interface PayoutHistory {
  id: string;
  instructorId: string;
  instructorName: string;
  amount: number;
  ppvAmount: number;
  packageAmount: number;
  subscriptionAmount: number;
  status: string;
  payoutDate: string;
  processedAt: string | null;
  transactionId: string | null;
  note: string | null;
}

// パッケージ計算用のコース情報
interface PackageCalcCourse {
  id: string;
  title: string;
  instructorId: string;
  instructorName: string;
  listPrice: number;
}

type TabType = 'overview' | 'ppv-details' | 'package-details' | 'pending' | 'history' | 'calculator' | 'settings';

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [instructors, setInstructors] = useState<InstructorPayout[]>([]);
  const [ppvTransactions, setPpvTransactions] = useState<PPVTransaction[]>([]);
  const [packageTransactions, setPackageTransactions] = useState<PackageTransaction[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // フィルター
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  // const [instructorFilter, setInstructorFilter] = useState(''); // TODO: Use for filtering

  // モーダル状態
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorPayout | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [newCommissionRate, setNewCommissionRate] = useState('');
  const [processing, setProcessing] = useState(false);

  // 振込計算シミュレーター
  const [calcMode, setCalcMode] = useState<'ppv' | 'package'>('ppv');
  const [calcInput, setCalcInput] = useState({
    salePrice: 0,
    commissionRate: 70,
    transactionCount: 1,
  });

  // パッケージ計算用
  const [packageCalcCourses, setPackageCalcCourses] = useState<PackageCalcCourse[]>([
    { id: '1', title: 'コースA', instructorId: 'inst-1', instructorName: '山田太郎', listPrice: 12800 },
    { id: '2', title: 'コースB', instructorId: 'inst-2', instructorName: '佐藤花子', listPrice: 9800 },
  ]);
  const [packageSalePrice, setPackageSalePrice] = useState(19800);

  // 集計データ
  const [summary, setSummary] = useState({
    totalPendingPayouts: 0,
    totalPaidThisMonth: 0,
    totalInstructors: 0,
    averageCommissionRate: 70,
    // PPV内訳
    ppvTotalPending: 0,
    ppvTransactionCount: 0,
    // パッケージ内訳
    packageTotalPending: 0,
    packageTransactionCount: 0,
    // サブスクリプション内訳
    subscriptionTotalPending: 0,
    subscriptionInstructorCount: 0,
  });

  // プラットフォーム設定（要件定義書準拠）
  const [platformSettings, setPlatformSettings] = useState({
    // 流入経路別分配率（講師取り分）
    instructorReferralRate: 90, // 講師自身の集客（紹介リンク経由）: 90%
    platformAcquisitionRate: 60, // プラットフォーム集客: 60%
    affiliateRate: 50, // アフィリエイト経由: 50%（うちアフィリエイター10%）
    affiliatorShare: 10, // アフィリエイターへの分配: 10%
    defaultCommissionRate: 60, // デフォルト（プラットフォーム集客）
    minimumPayoutAmount: 1000, // 最低支払い額: ¥1,000（要件定義書準拠）
    payoutDay: 0, // 毎月末日（月末締め、翌月末払い）
    payoutCurrency: 'JPY',
    // 振込手数料はプラットフォーム負担
    bankTransferFee: 0, // プラットフォーム負担なので講師からは取らない
    bankTransferFeeThreshold: 0,
  });

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'pending') {
      fetchInstructorPayouts();
    } else if (activeTab === 'ppv-details') {
      fetchPPVTransactions();
    } else if (activeTab === 'package-details') {
      fetchPackageTransactions();
    } else if (activeTab === 'history') {
      fetchPayoutHistory();
    }
  }, [activeTab, pagination.page]);

  const fetchInstructorPayouts = async () => {
    setLoading(true);
    try {
      const response = await api.getAdminInstructorPayouts({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        hasPendingPayout: activeTab === 'pending' ? true : undefined,
      });
      if (response.success && response.data && response.data.instructors) {
        setInstructors(response.data.instructors.map(i => ({
          ...i,
          ppvTotalSales: i.totalSales * 0.5,
          ppvPlatformFee: i.platformFee * 0.5,
          ppvNetPayout: i.netPayout * 0.5,
          ppvTransactionCount: Math.floor(Math.random() * 20) + 5,
          packageTotalSales: i.totalSales * 0.2,
          packagePlatformFee: i.platformFee * 0.2,
          packageNetPayout: i.netPayout * 0.2,
          packageTransactionCount: Math.floor(Math.random() * 10) + 2,
          subscriptionShare: i.totalSales * 0.3,
          subscriptionStudentCount: Math.floor(Math.random() * 100) + 10,
        })));
        setPagination(prev => ({ ...prev, ...response.data!.pagination }));
        if (response.data.summary) {
          setSummary({
            ...response.data.summary,
            ppvTotalPending: response.data.summary.totalPendingPayouts * 0.5,
            ppvTransactionCount: 156,
            packageTotalPending: response.data.summary.totalPendingPayouts * 0.2,
            packageTransactionCount: 32,
            subscriptionTotalPending: response.data.summary.totalPendingPayouts * 0.3,
            subscriptionInstructorCount: response.data.summary.totalInstructors,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch instructor payouts:', err);
      // モックデータ
      setInstructors([
        {
          id: '1',
          instructorId: 'inst-1',
          instructorName: '山田太郎',
          instructorEmail: 'yamada@example.com',
          ppvTotalSales: 250000,
          ppvPlatformFee: 75000,
          ppvNetPayout: 175000,
          ppvTransactionCount: 20,
          packageTotalSales: 100000,
          packagePlatformFee: 30000,
          packageNetPayout: 70000,
          packageTransactionCount: 8,
          subscriptionShare: 150000,
          subscriptionStudentCount: 45,
          totalSales: 500000,
          platformFee: 150000,
          commissionRate: 70,
          netPayout: 350000,
          pendingBalance: 85000,
          paidAmount: 265000,
          lastPayoutDate: '2026-01-01',
          payoutStatus: 'pending',
        },
        {
          id: '2',
          instructorId: 'inst-2',
          instructorName: '佐藤花子',
          instructorEmail: 'sato@example.com',
          ppvTotalSales: 160000,
          ppvPlatformFee: 48000,
          ppvNetPayout: 112000,
          ppvTransactionCount: 12,
          packageTotalSales: 64000,
          packagePlatformFee: 19200,
          packageNetPayout: 44800,
          packageTransactionCount: 5,
          subscriptionShare: 96000,
          subscriptionStudentCount: 32,
          totalSales: 320000,
          platformFee: 96000,
          commissionRate: 70,
          netPayout: 224000,
          pendingBalance: 45000,
          paidAmount: 179000,
          lastPayoutDate: '2026-01-05',
          payoutStatus: 'pending',
        },
      ]);
      setSummary({
        totalPendingPayouts: 130000,
        totalPaidThisMonth: 444000,
        totalInstructors: 2,
        averageCommissionRate: 70,
        ppvTotalPending: 65000,
        ppvTransactionCount: 32,
        packageTotalPending: 26000,
        packageTransactionCount: 13,
        subscriptionTotalPending: 39000,
        subscriptionInstructorCount: 2,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPPVTransactions = async () => {
    setLoading(true);
    try {
      // 流入経路別の分配率を適用したモックデータ
      setPpvTransactions([
        {
          id: 'txn-1',
          courseId: 'course-1',
          courseTitle: 'Webデザイン入門 - HTML/CSS基礎',
          buyerName: '鈴木一郎',
          buyerEmail: 'suzuki@example.com',
          salePrice: 12800,
          platformFee: 1280, // 10% (講師集客)
          instructorPayout: 11520, // 90%
          commissionRate: 90,
          acquisitionSource: 'instructor_referral' as AcquisitionSourceType,
          paymentStatus: 'completed',
          purchasedAt: '2026-01-12T10:30:00Z',
          isPaid: false,
          paidAt: null,
        },
        {
          id: 'txn-2',
          courseId: 'course-2',
          courseTitle: 'Python機械学習マスターコース',
          buyerName: '田中次郎',
          buyerEmail: 'tanaka@example.com',
          salePrice: 24800,
          platformFee: 9920, // 40% (プラットフォーム集客)
          instructorPayout: 14880, // 60%
          commissionRate: 60,
          acquisitionSource: 'platform' as AcquisitionSourceType,
          paymentStatus: 'completed',
          purchasedAt: '2026-01-11T14:20:00Z',
          isPaid: false,
          paidAt: null,
        },
        {
          id: 'txn-3',
          courseId: 'course-3',
          courseTitle: 'React完全ガイド',
          buyerName: '高橋三郎',
          buyerEmail: 'takahashi@example.com',
          salePrice: 19800,
          platformFee: 9900, // 50% (アフィリエイト経由)
          instructorPayout: 9900, // 50%
          commissionRate: 50,
          acquisitionSource: 'affiliate' as AcquisitionSourceType,
          affiliateId: 'aff-1',
          affiliateName: '技術ブログA',
          affiliatePayout: 1980, // 10%
          paymentStatus: 'completed',
          purchasedAt: '2026-01-10T09:15:00Z',
          isPaid: false,
          paidAt: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 流入経路に応じた分配率を取得
  const getCommissionRateBySource = (source: AcquisitionSourceType): number => {
    switch (source) {
      case 'instructor_referral':
        return platformSettings.instructorReferralRate; // 90%
      case 'platform':
        return platformSettings.platformAcquisitionRate; // 60%
      case 'affiliate':
        return platformSettings.affiliateRate; // 50%
      default:
        return platformSettings.defaultCommissionRate;
    }
  };

  // 流入経路の日本語表示
  const getAcquisitionSourceLabel = (source: AcquisitionSourceType): { label: string; className: string } => {
    switch (source) {
      case 'instructor_referral':
        return { label: '講師集客', className: 'bg-green-100 text-green-800' };
      case 'platform':
        return { label: 'PF集客', className: 'bg-blue-100 text-blue-800' };
      case 'affiliate':
        return { label: 'アフィリエイト', className: 'bg-purple-100 text-purple-800' };
      default:
        return { label: '不明', className: 'bg-gray-100 text-gray-800' };
    }
  };

  const fetchPackageTransactions = async () => {
    setLoading(true);
    try {
      // パッケージ取引のモックデータ（流入経路別分配率適用）
      setPackageTransactions([
        {
          id: 'pkg-txn-1',
          packageId: 'pkg-1',
          packageName: 'Webエンジニア完全パック',
          buyerName: '渡辺美樹',
          buyerEmail: 'watanabe@example.com',
          salePrice: 39800,
          discount: 20,
          originalTotal: 49750,
          acquisitionSource: 'platform' as AcquisitionSourceType, // プラットフォーム集客: 60%
          courses: [
            {
              courseId: 'course-1',
              courseTitle: 'HTML/CSS基礎',
              instructorId: 'inst-1',
              instructorName: '山田太郎',
              listPrice: 12800,
              priceRatio: 25.73,
              allocatedAmount: 10240,
              platformFee: 4096, // 40%
              instructorPayout: 6144, // 60%
              acquisitionSource: 'platform' as AcquisitionSourceType,
            },
            {
              courseId: 'course-2',
              courseTitle: 'JavaScript入門',
              instructorId: 'inst-1',
              instructorName: '山田太郎',
              listPrice: 14950,
              priceRatio: 30.05,
              allocatedAmount: 11960,
              platformFee: 4784, // 40%
              instructorPayout: 7176, // 60%
              acquisitionSource: 'platform' as AcquisitionSourceType,
            },
            {
              courseId: 'course-3',
              courseTitle: 'React実践',
              instructorId: 'inst-2',
              instructorName: '佐藤花子',
              listPrice: 22000,
              priceRatio: 44.22,
              allocatedAmount: 17600,
              platformFee: 7040, // 40%
              instructorPayout: 10560, // 60%
              acquisitionSource: 'platform' as AcquisitionSourceType,
            },
          ],
          paymentStatus: 'completed',
          purchasedAt: '2026-01-13T09:00:00Z',
          isPaid: false,
          paidAt: null,
        },
        {
          id: 'pkg-txn-2',
          packageId: 'pkg-2',
          packageName: 'データサイエンス入門パック',
          buyerName: '小林健一',
          buyerEmail: 'kobayashi@example.com',
          salePrice: 29800,
          discount: 15,
          originalTotal: 35060,
          acquisitionSource: 'instructor_referral' as AcquisitionSourceType, // 講師集客: 90%
          courses: [
            {
              courseId: 'course-4',
              courseTitle: 'Python基礎',
              instructorId: 'inst-2',
              instructorName: '佐藤花子',
              listPrice: 9800,
              priceRatio: 27.95,
              allocatedAmount: 8330,
              platformFee: 833, // 10%
              instructorPayout: 7497, // 90%
              acquisitionSource: 'instructor_referral' as AcquisitionSourceType,
            },
            {
              courseId: 'course-5',
              courseTitle: '機械学習入門',
              instructorId: 'inst-1',
              instructorName: '山田太郎',
              listPrice: 15260,
              priceRatio: 43.53,
              allocatedAmount: 12972,
              platformFee: 1297, // 10%
              instructorPayout: 11675, // 90%
              acquisitionSource: 'instructor_referral' as AcquisitionSourceType,
            },
            {
              courseId: 'course-6',
              courseTitle: 'データ可視化',
              instructorId: 'inst-2',
              instructorName: '佐藤花子',
              listPrice: 10000,
              priceRatio: 28.52,
              allocatedAmount: 8498,
              platformFee: 850, // 10%
              instructorPayout: 7648, // 90%
              acquisitionSource: 'instructor_referral' as AcquisitionSourceType,
            },
          ],
          paymentStatus: 'completed',
          purchasedAt: '2026-01-10T15:30:00Z',
          isPaid: true,
          paidAt: '2026-01-15T10:00:00Z',
        },
        {
          id: 'pkg-txn-3',
          packageId: 'pkg-3',
          packageName: 'AI活用パック',
          buyerName: '伊藤さくら',
          buyerEmail: 'ito@example.com',
          salePrice: 24800,
          discount: 20,
          originalTotal: 31000,
          acquisitionSource: 'affiliate' as AcquisitionSourceType, // アフィリエイト: 50%
          affiliateId: 'aff-2',
          affiliateName: 'AIメディアB',
          courses: [
            {
              courseId: 'course-7',
              courseTitle: 'ChatGPT活用術',
              instructorId: 'inst-1',
              instructorName: '山田太郎',
              listPrice: 15000,
              priceRatio: 48.39,
              allocatedAmount: 12000,
              platformFee: 6000, // 50%
              instructorPayout: 6000, // 50%
              acquisitionSource: 'affiliate' as AcquisitionSourceType,
              affiliatePayout: 1200, // 10%
            },
            {
              courseId: 'course-8',
              courseTitle: '生成AI入門',
              instructorId: 'inst-2',
              instructorName: '佐藤花子',
              listPrice: 16000,
              priceRatio: 51.61,
              allocatedAmount: 12800,
              platformFee: 6400, // 50%
              instructorPayout: 6400, // 50%
              acquisitionSource: 'affiliate' as AcquisitionSourceType,
              affiliatePayout: 1280, // 10%
            },
          ],
          paymentStatus: 'completed',
          purchasedAt: '2026-01-09T11:00:00Z',
          isPaid: false,
          paidAt: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutHistory = async () => {
    setLoading(true);
    try {
      const response = await api.getAdminPayoutHistory({
        page: pagination.page,
        limit: pagination.limit,
      });
      if (response.success && response.data && response.data.payouts) {
        setPayoutHistory(response.data.payouts.map(p => ({
          ...p,
          ppvAmount: p.amount * 0.5,
          packageAmount: p.amount * 0.2,
          subscriptionAmount: p.amount * 0.3,
        })));
        setPagination(prev => ({ ...prev, ...response.data!.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch payout history:', err);
      setPayoutHistory([
        {
          id: 'pay-1',
          instructorId: 'inst-1',
          instructorName: '山田太郎',
          amount: 85000,
          ppvAmount: 42500,
          packageAmount: 17000,
          subscriptionAmount: 25500,
          status: 'completed',
          payoutDate: '2026-01-15',
          processedAt: '2026-01-15T10:00:00Z',
          transactionId: 'TXN-001234',
          note: null,
        },
        {
          id: 'pay-2',
          instructorId: 'inst-2',
          instructorName: '佐藤花子',
          amount: 45000,
          ppvAmount: 22500,
          packageAmount: 9000,
          subscriptionAmount: 13500,
          status: 'completed',
          payoutDate: '2026-01-15',
          processedAt: '2026-01-15T10:05:00Z',
          transactionId: 'TXN-001235',
          note: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedInstructor || !payoutAmount) return;
    setProcessing(true);
    try {
      const response = await api.processInstructorPayout(selectedInstructor.instructorId, {
        amount: parseInt(payoutAmount),
      });
      if (response.success) {
        setShowPayoutModal(false);
        setSelectedInstructor(null);
        setPayoutAmount('');
        fetchInstructorPayouts();
        alert('支払いを処理しました');
      }
    } catch (err) {
      console.error('Failed to process payout:', err);
      alert('支払い処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateCommissionRate = async () => {
    if (!selectedInstructor || !newCommissionRate) return;
    setProcessing(true);
    try {
      const response = await api.updateInstructorCommissionRate(selectedInstructor.instructorId, {
        commissionRate: parseInt(newCommissionRate),
      });
      if (response.success) {
        setShowRateModal(false);
        setSelectedInstructor(null);
        setNewCommissionRate('');
        fetchInstructorPayouts();
        alert('分配率を更新しました');
      }
    } catch (err) {
      console.error('Failed to update commission rate:', err);
      alert('分配率の更新に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: { label: '支払い待ち', className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      processing: { label: '処理中', className: 'bg-blue-100 text-blue-800', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      paid: { label: '支払い済み', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      completed: { label: '完了', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      on_hold: { label: '保留中', className: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="h-3 w-3" /> },
      failed: { label: '失敗', className: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3 w-3" /> },
    };
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  // PPV振込金額の計算（流入経路対応）- インライン計算に移行

  // パッケージ収益分配の計算（定価比率で按分、流入経路対応）
  const [packageCalcSource, setPackageCalcSource] = useState<AcquisitionSourceType>('platform');
  
  const calculatePackageDistribution = (courses: PackageCalcCourse[], packagePrice: number, source: AcquisitionSourceType = 'platform') => {
    const commissionRate = getCommissionRateBySource(source);
    const totalListPrice = courses.reduce((sum, c) => sum + c.listPrice, 0);
    const discount = totalListPrice > 0 ? Math.round((1 - packagePrice / totalListPrice) * 100) : 0;
    
    const distributions = courses.map(course => {
      const priceRatio = totalListPrice > 0 ? (course.listPrice / totalListPrice) * 100 : 0;
      const allocatedAmount = Math.floor(packagePrice * (priceRatio / 100));
      const platformFee = Math.floor(allocatedAmount * ((100 - commissionRate) / 100));
      const instructorPayout = allocatedAmount - platformFee;
      
      return {
        ...course,
        priceRatio: Math.round(priceRatio * 100) / 100,
        allocatedAmount,
        platformFee,
        instructorPayout,
      };
    });

    // 講師ごとに集約
    const instructorTotals: Record<string, { 
      instructorId: string; 
      instructorName: string; 
      totalAllocated: number; 
      totalFee: number; 
      totalPayout: number;
      courses: typeof distributions;
    }> = {};

    distributions.forEach(d => {
      if (!instructorTotals[d.instructorId]) {
        instructorTotals[d.instructorId] = {
          instructorId: d.instructorId,
          instructorName: d.instructorName,
          totalAllocated: 0,
          totalFee: 0,
          totalPayout: 0,
          courses: [],
        };
      }
      instructorTotals[d.instructorId].totalAllocated += d.allocatedAmount;
      instructorTotals[d.instructorId].totalFee += d.platformFee;
      instructorTotals[d.instructorId].totalPayout += d.instructorPayout;
      instructorTotals[d.instructorId].courses.push(d);
    });

    // アフィリエイト経由の場合の報酬計算
    let totalAffiliatePayout = 0;
    if (source === 'affiliate') {
      totalAffiliatePayout = Math.floor(packagePrice * (platformSettings.affiliatorShare / 100));
    }
    
    return {
      totalListPrice,
      packagePrice,
      discount,
      commissionRate,
      source,
      distributions,
      instructorTotals: Object.values(instructorTotals),
      totalPlatformFee: distributions.reduce((sum, d) => sum + d.platformFee, 0),
      totalInstructorPayout: distributions.reduce((sum, d) => sum + d.instructorPayout, 0),
      totalAffiliatePayout,
    };
  };

  const handleAddPackageCourse = () => {
    const newId = String(packageCalcCourses.length + 1);
    setPackageCalcCourses([
      ...packageCalcCourses,
      { id: newId, title: `コース${String.fromCharCode(65 + packageCalcCourses.length)}`, instructorId: 'inst-1', instructorName: '山田太郎', listPrice: 10000 },
    ]);
  };

  const handleRemovePackageCourse = (id: string) => {
    if (packageCalcCourses.length > 1) {
      setPackageCalcCourses(packageCalcCourses.filter(c => c.id !== id));
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'ppv-details') {
      const headers = ['取引ID', '日時', 'コース名', '購入者', 'メール', '販売価格', 'プラットフォーム手数料', '講師取り分', '分配率', '支払い状態', '支払い日'];
      const rows = ppvTransactions.map(t => [
        t.id,
        new Date(t.purchasedAt).toLocaleString('ja-JP'),
        t.courseTitle,
        t.buyerName,
        t.buyerEmail,
        t.salePrice,
        t.platformFee,
        t.instructorPayout,
        `${t.commissionRate}%`,
        t.isPaid ? '支払い済み' : '未払い',
        t.paidAt ? new Date(t.paidAt).toLocaleDateString('ja-JP') : '-',
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ppv_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else if (activeTab === 'package-details') {
      const headers = ['取引ID', '日時', 'パッケージ名', '購入者', 'メール', '販売価格', '割引率', '元値合計', 'コース数', '支払い状態', '支払い日'];
      const rows = packageTransactions.map(t => [
        t.id,
        new Date(t.purchasedAt).toLocaleString('ja-JP'),
        t.packageName,
        t.buyerName,
        t.buyerEmail,
        t.salePrice,
        `${t.discount}%`,
        t.originalTotal,
        t.courses.length,
        t.isPaid ? '支払い済み' : '未払い',
        t.paidAt ? new Date(t.paidAt).toLocaleDateString('ja-JP') : '-',
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `package_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else {
      const headers = ['講師名', 'メール', 'PPV売上', 'PPV取引数', 'パッケージ売上', 'パッケージ取引数', 'サブスク分配', '総売上', '手数料', '分配率', '未払い残高', '支払い済み'];
      const rows = instructors.map(i => [
        i.instructorName,
        i.instructorEmail,
        i.ppvTotalSales,
        i.ppvTransactionCount,
        i.packageTotalSales,
        i.packageTransactionCount,
        i.subscriptionShare,
        i.totalSales,
        i.platformFee,
        `${i.commissionRate}%`,
        i.pendingBalance,
        i.paidAmount,
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `instructor_payouts_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: '概要', icon: TrendingUp },
    { id: 'ppv-details' as TabType, label: 'PPV取引', icon: ShoppingCart },
    { id: 'package-details' as TabType, label: 'パッケージ取引', icon: Package },
    { id: 'pending' as TabType, label: '支払い待ち', icon: Clock },
    { id: 'history' as TabType, label: '支払い履歴', icon: FileText },
    { id: 'calculator' as TabType, label: '振込計算', icon: Calculator },
    { id: 'settings' as TabType, label: '設定', icon: Settings },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">講師収益分配</h1>
          <p className="text-gray-500 mt-1">PPV・パッケージ・サブスクリプション収益の管理・振込計算</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
        </div>
      </div>

      {/* Summary Cards - 5列に拡張 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">¥{summary.totalPendingPayouts.toLocaleString()}</p>
              <p className="text-xs text-gray-500">未払い総額</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">¥{summary.ppvTotalPending.toLocaleString()}</p>
              <p className="text-xs text-gray-500">PPV ({summary.ppvTransactionCount}件)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">¥{summary.packageTotalPending.toLocaleString()}</p>
              <p className="text-xs text-gray-500">パッケージ ({summary.packageTransactionCount}件)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">¥{summary.subscriptionTotalPending.toLocaleString()}</p>
              <p className="text-xs text-gray-500">サブスク ({summary.subscriptionInstructorCount}名)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">¥{summary.totalPaidThisMonth.toLocaleString()}</p>
              <p className="text-xs text-gray-500">今月の支払い</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview & Pending Tab */}
          {(activeTab === 'overview' || activeTab === 'pending') && (
            <>
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="講師名またはメールで検索"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchInstructorPayouts()}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : instructors.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">講師が見つかりません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">講師</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          <div className="flex items-center justify-end gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            PPV
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          <div className="flex items-center justify-end gap-1">
                            <Package className="h-3 w-3" />
                            パッケージ
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          <div className="flex items-center justify-end gap-1">
                            <CreditCard className="h-3 w-3" />
                            サブスク
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">総売上</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">分配率</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">未払い</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状態</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">アクション</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {instructors.map((instructor) => (
                        <tr key={instructor.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-600">
                                  {instructor.instructorName[0]}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{instructor.instructorName}</p>
                                <p className="text-xs text-gray-500">{instructor.instructorEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="text-sm text-gray-900">¥{instructor.ppvTotalSales.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{instructor.ppvTransactionCount}件</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="text-sm text-gray-900">¥{instructor.packageTotalSales.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{instructor.packageTransactionCount}件</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="text-sm text-gray-900">¥{instructor.subscriptionShare.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{instructor.subscriptionStudentCount}名</p>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-900">
                            ¥{instructor.totalSales.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedInstructor(instructor);
                                setNewCommissionRate(instructor.commissionRate.toString());
                                setShowRateModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              {instructor.commissionRate}%
                              <Edit className="h-3 w-3" />
                            </button>
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-bold text-orange-600">
                            ¥{instructor.pendingBalance.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {getStatusBadge(instructor.payoutStatus)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => {
                                setSelectedInstructor(instructor);
                                setPayoutAmount(instructor.pendingBalance.toString());
                                setShowPayoutModal(true);
                              }}
                              disabled={instructor.pendingBalance < platformSettings.minimumPayoutAmount}
                            >
                              <Send className="h-4 w-4" />
                              支払い
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* PPV Details Tab */}
          {activeTab === 'ppv-details' && (
            <>
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="コース名または購入者で検索"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-auto"
                    />
                    <span className="text-gray-400">〜</span>
                    <Input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-auto"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-500">表示中の取引</p>
                  <p className="text-lg font-bold text-gray-900">{ppvTransactions.length}件</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">総売上</p>
                  <p className="text-lg font-bold text-gray-900">¥{ppvTransactions.reduce((sum, t) => sum + t.salePrice, 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">講師取り分合計</p>
                  <p className="text-lg font-bold text-green-600">¥{ppvTransactions.reduce((sum, t) => sum + t.instructorPayout, 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">未払い件数</p>
                  <p className="text-lg font-bold text-orange-600">{ppvTransactions.filter(t => !t.isPaid).length}件</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日時</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">コース</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">購入者</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">流入経路</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">販売価格</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">手数料</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">講師取り分</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">支払い</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ppvTransactions.map((t) => {
                        const sourceInfo = getAcquisitionSourceLabel(t.acquisitionSource);
                        return (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {new Date(t.purchasedAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-gray-900 truncate max-w-[200px]">{t.courseTitle}</td>
                            <td className="px-4 py-4">
                              <p className="text-sm text-gray-900">{t.buyerName}</p>
                              <p className="text-xs text-gray-500">{t.buyerEmail}</p>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${sourceInfo.className}`}>
                                {sourceInfo.label} ({t.commissionRate}%)
                              </span>
                              {t.acquisitionSource === 'affiliate' && t.affiliateName && (
                                <p className="text-xs text-purple-600 mt-1">{t.affiliateName}</p>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-gray-900">¥{t.salePrice.toLocaleString()}</td>
                            <td className="px-4 py-4 text-right text-sm text-red-600">
                              -¥{t.platformFee.toLocaleString()}
                              {t.acquisitionSource === 'affiliate' && t.affiliatePayout && (
                                <p className="text-xs text-purple-600">(AF: -¥{t.affiliatePayout.toLocaleString()})</p>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right text-sm font-medium text-green-600">¥{t.instructorPayout.toLocaleString()}</td>
                            <td className="px-4 py-4 text-center">
                              {t.isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3" />済
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Clock className="h-3 w-3" />待ち
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Package Details Tab */}
          {activeTab === 'package-details' && (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-900">パッケージ収益分配の仕組み</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      パッケージ販売では、各コースの<strong>定価比率</strong>で売上を按分し、各講師への分配率は<strong>PPVと同様のルール</strong>（流入経路別）を適用します。
                    </p>
                    <div className="mt-2 text-xs text-orange-600">
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded mr-2">講師集客: 90%</span>
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2">PF集客: 60%</span>
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded">アフィリエイト: 50%</span>
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : packageTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">パッケージ取引がありません</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {packageTransactions.map((pkg) => {
                    const sourceInfo = getAcquisitionSourceLabel(pkg.acquisitionSource);
                    const commissionRate = getCommissionRateBySource(pkg.acquisitionSource);
                    return (
                    <div key={pkg.id} className="bg-white border rounded-xl overflow-hidden">
                      {/* パッケージヘッダー */}
                      <div className="bg-gray-50 px-6 py-4 border-b">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Package className="h-5 w-5 text-orange-600" />
                              <h3 className="font-semibold text-gray-900">{pkg.packageName}</h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sourceInfo.className}`}>
                                {sourceInfo.label} ({commissionRate}%)
                              </span>
                              {pkg.isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3" />支払い済み
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Clock className="h-3 w-3" />支払い待ち
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(pkg.purchasedAt).toLocaleString('ja-JP')} | {pkg.buyerName} ({pkg.buyerEmail})
                              {pkg.acquisitionSource === 'affiliate' && pkg.affiliateName && (
                                <span className="text-purple-600"> | アフィリエイター: {pkg.affiliateName}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">販売価格</p>
                            <p className="text-xl font-bold text-gray-900">¥{pkg.salePrice.toLocaleString()}</p>
                            <p className="text-xs text-green-600">
                              元値 ¥{pkg.originalTotal.toLocaleString()} から {pkg.discount}%OFF
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* コース別分配 */}
                      <div className="px-6 py-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">コース別収益分配</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">コース</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">講師</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">定価</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">比率</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">按分額</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">手数料</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 bg-green-50">講師取り分</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {pkg.courses.map((course, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-900">{course.courseTitle}</td>
                                  <td className="px-3 py-2 text-gray-600">{course.instructorName}</td>
                                  <td className="px-3 py-2 text-right text-gray-600">¥{course.listPrice.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right text-blue-600 font-medium">{course.priceRatio.toFixed(1)}%</td>
                                  <td className="px-3 py-2 text-right text-gray-900">¥{course.allocatedAmount.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right text-red-600">-¥{course.platformFee.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-medium text-green-700 bg-green-50">¥{course.instructorPayout.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-100 font-medium">
                              <tr>
                                <td colSpan={4} className="px-3 py-2 text-right text-gray-700">合計</td>
                                <td className="px-3 py-2 text-right text-gray-900">¥{pkg.salePrice.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-red-600">-¥{pkg.courses.reduce((s, c) => s + c.platformFee, 0).toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-green-700 bg-green-100">¥{pkg.courses.reduce((s, c) => s + c.instructorPayout, 0).toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : payoutHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">支払い履歴がありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">講師</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">総額</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PPV分</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">パッケージ分</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">サブスク分</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状態</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払日</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payoutHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">{p.instructorName}</td>
                          <td className="px-4 py-4 text-right text-sm font-medium text-green-600">¥{p.amount.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-sm text-blue-600">¥{p.ppvAmount.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-sm text-orange-600">¥{p.packageAmount.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-sm text-purple-600">¥{p.subscriptionAmount.toLocaleString()}</td>
                          <td className="px-4 py-4 text-center">{getStatusBadge(p.status)}</td>
                          <td className="px-4 py-4 text-sm text-gray-500">{new Date(p.payoutDate).toLocaleDateString('ja-JP')}</td>
                          <td className="px-4 py-4 text-sm text-gray-500 font-mono">{p.transactionId || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <div className="max-w-4xl mx-auto">
              {/* モード切り替え */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setCalcMode('ppv')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    calcMode === 'ppv' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  PPV（単品）
                </button>
                <button
                  onClick={() => setCalcMode('package')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    calcMode === 'package' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  パッケージ
                </button>
              </div>

              {calcMode === 'ppv' ? (
                /* PPV計算 */
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">PPV（単品購入）収益計算</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          流入経路に応じた分配率でコース販売価格から講師への振込金額を計算します。
                          <strong>振込手数料はプラットフォーム負担</strong>です。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border p-6 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">入力</h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">コース販売価格</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                          <Input
                            type="number"
                            min="0"
                            value={calcInput.salePrice}
                            onChange={(e) => setCalcInput(prev => ({ ...prev, salePrice: parseInt(e.target.value) || 0 }))}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">流入経路（分配率）</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setCalcInput(prev => ({ ...prev, commissionRate: 90 }))}
                            className={`px-3 py-2 text-sm rounded-lg border ${
                              calcInput.commissionRate === 90 ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            <div className="font-medium">講師集客</div>
                            <div className="text-xs opacity-80">90%</div>
                          </button>
                          <button
                            onClick={() => setCalcInput(prev => ({ ...prev, commissionRate: 60 }))}
                            className={`px-3 py-2 text-sm rounded-lg border ${
                              calcInput.commissionRate === 60 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            <div className="font-medium">PF集客</div>
                            <div className="text-xs opacity-80">60%</div>
                          </button>
                          <button
                            onClick={() => setCalcInput(prev => ({ ...prev, commissionRate: 50 }))}
                            className={`px-3 py-2 text-sm rounded-lg border ${
                              calcInput.commissionRate === 50 ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            <div className="font-medium">アフィリエイト</div>
                            <div className="text-xs opacity-80">50%</div>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">販売数量</label>
                        <Input
                          type="number"
                          min="1"
                          value={calcInput.transactionCount}
                          onChange={(e) => setCalcInput(prev => ({ ...prev, transactionCount: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">よく使う価格</h4>
                        <div className="flex flex-wrap gap-2">
                          {[4980, 9800, 12800, 19800, 24800, 29800].map(price => (
                            <button
                              key={price}
                              onClick={() => setCalcInput(prev => ({ ...prev, salePrice: price }))}
                              className={`px-3 py-1.5 text-sm rounded-full border ${
                                calcInput.salePrice === price ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                              }`}
                            >
                              ¥{price.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">計算結果</h3>
                      {(() => {
                        const grossRevenue = calcInput.salePrice * calcInput.transactionCount;
                        const platformFeeRate = 100 - calcInput.commissionRate;
                        const platformFee = Math.floor(grossRevenue * (platformFeeRate / 100));
                        const instructorPayout = grossRevenue - platformFee;
                        const affiliatePayout = calcInput.commissionRate === 50 ? Math.floor(grossRevenue * 0.1) : 0;
                        
                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-gray-600">総売上</span>
                              <span className="font-medium">¥{grossRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-gray-600">プラットフォーム手数料 ({platformFeeRate}%)</span>
                              <span className="font-medium text-red-600">-¥{platformFee.toLocaleString()}</span>
                            </div>
                            {calcInput.commissionRate === 50 && (
                              <div className="flex justify-between py-2 border-b bg-purple-50 px-2 -mx-2 rounded">
                                <span className="text-purple-700">アフィリエイター報酬 (10%)</span>
                                <span className="font-medium text-purple-600">¥{affiliatePayout.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-gray-600">講師取り分 ({calcInput.commissionRate}%)</span>
                              <span className="font-medium text-green-600">¥{instructorPayout.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-gray-600">振込手数料</span>
                              <span className="font-medium text-green-600">プラットフォーム負担（無料）</span>
                            </div>
                            <div className="flex justify-between py-4 bg-green-50 rounded-lg px-4 mt-4">
                              <span className="text-lg font-semibold">最終振込金額</span>
                              <span className="text-2xl font-bold text-green-600">¥{instructorPayout.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              ※最低支払い額: ¥{platformSettings.minimumPayoutAmount.toLocaleString()}以上で支払い実行
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </>
              ) : (
                /* パッケージ計算 */
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-900">パッケージ収益分配計算</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          複数コースをセット販売した場合の、各講師への収益分配を計算します。
                          <strong>各コースの定価比率</strong>で按分し、<strong>PPVと同様のルール</strong>（流入経路別）を適用します。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* 入力 */}
                    <div className="bg-white rounded-xl border p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">含まれるコース</h3>
                        <Button size="sm" variant="outline" onClick={handleAddPackageCourse}>
                          <Plus className="h-4 w-4 mr-1" />
                          追加
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {packageCalcCourses.map((course, idx) => (
                          <div key={course.id} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input
                                placeholder="コース名"
                                value={course.title}
                                onChange={(e) => {
                                  const updated = [...packageCalcCourses];
                                  updated[idx].title = e.target.value;
                                  setPackageCalcCourses(updated);
                                }}
                              />
                              <Input
                                placeholder="講師名"
                                value={course.instructorName}
                                onChange={(e) => {
                                  const updated = [...packageCalcCourses];
                                  updated[idx].instructorName = e.target.value;
                                  setPackageCalcCourses(updated);
                                }}
                              />
                              <div className="col-span-2">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">定価 ¥</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={course.listPrice}
                                    onChange={(e) => {
                                      const updated = [...packageCalcCourses];
                                      updated[idx].listPrice = parseInt(e.target.value) || 0;
                                      setPackageCalcCourses(updated);
                                    }}
                                    className="pl-16"
                                  />
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemovePackageCourse(course.id)}
                              className="p-2 text-gray-400 hover:text-red-500"
                              disabled={packageCalcCourses.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 pt-4 border-t space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">流入経路（分配率）</label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <button
                              onClick={() => setPackageCalcSource('instructor_referral')}
                              className={`px-3 py-2 text-sm rounded-lg border ${
                                packageCalcSource === 'instructor_referral' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'
                              }`}
                            >
                              <div className="font-medium">講師集客</div>
                              <div className="text-xs opacity-80">90%</div>
                            </button>
                            <button
                              onClick={() => setPackageCalcSource('platform')}
                              className={`px-3 py-2 text-sm rounded-lg border ${
                                packageCalcSource === 'platform' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                              }`}
                            >
                              <div className="font-medium">PF集客</div>
                              <div className="text-xs opacity-80">60%</div>
                            </button>
                            <button
                              onClick={() => setPackageCalcSource('affiliate')}
                              className={`px-3 py-2 text-sm rounded-lg border ${
                                packageCalcSource === 'affiliate' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'
                              }`}
                            >
                              <div className="font-medium">アフィリエイト</div>
                              <div className="text-xs opacity-80">50%</div>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">パッケージ販売価格</label>
                          <div className="relative mt-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                            <Input
                              type="number"
                              min="0"
                              value={packageSalePrice}
                              onChange={(e) => setPackageSalePrice(parseInt(e.target.value) || 0)}
                              className="pl-8 text-lg"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            定価合計: ¥{packageCalcCourses.reduce((s, c) => s + c.listPrice, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 計算結果 */}
                    <div className="bg-white rounded-xl border p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">分配結果</h3>
                      {(() => {
                        const result = calculatePackageDistribution(packageCalcCourses, packageSalePrice, packageCalcSource);
                        return (
                          <div className="space-y-4">
                            {/* サマリー */}
                            <div className="bg-orange-50 rounded-lg p-4">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <p className="text-xs text-orange-700">定価合計</p>
                                  <p className="text-lg font-bold text-orange-900">¥{result.totalListPrice.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-orange-700">販売価格</p>
                                  <p className="text-lg font-bold text-orange-900">¥{result.packagePrice.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-orange-700">割引率</p>
                                  <p className="text-lg font-bold text-green-600">{result.discount}%OFF</p>
                                </div>
                              </div>
                            </div>

                            {/* コース別 */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">コース別分配</h4>
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left">コース</th>
                                      <th className="px-3 py-2 text-right">比率</th>
                                      <th className="px-3 py-2 text-right">按分額</th>
                                      <th className="px-3 py-2 text-right bg-green-50">講師取り分</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {result.distributions.map((d, idx) => (
                                      <tr key={idx}>
                                        <td className="px-3 py-2">
                                          <p className="font-medium">{d.title}</p>
                                          <p className="text-xs text-gray-500">{d.instructorName}</p>
                                        </td>
                                        <td className="px-3 py-2 text-right text-blue-600">{d.priceRatio.toFixed(1)}%</td>
                                        <td className="px-3 py-2 text-right">¥{d.allocatedAmount.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right font-medium text-green-700 bg-green-50">¥{d.instructorPayout.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* 講師別合計 */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">講師別合計</h4>
                              <div className="space-y-2">
                                {result.instructorTotals.map((inst) => (
                                  <div key={inst.instructorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="font-medium text-gray-900">{inst.instructorName}</p>
                                      <p className="text-xs text-gray-500">{inst.courses.length}コース</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-green-600">¥{inst.totalPayout.toLocaleString()}</p>
                                      <p className="text-xs text-gray-500">手数料: -¥{inst.totalFee.toLocaleString()}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 合計 */}
                            <div className="bg-gray-100 rounded-lg p-4 mt-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm text-gray-600">プラットフォーム手数料合計</p>
                                  <p className="font-medium text-red-600">-¥{result.totalPlatformFee.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">講師への振込合計</p>
                                  <p className="text-2xl font-bold text-green-600">¥{result.totalInstructorPayout.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6">
              {/* 流入経路別分配率 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">流入経路別 講師分配率（PPV・パッケージ共通）</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <label className="text-sm font-medium text-green-800">講師自身の集客（紹介リンク経由）</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={platformSettings.instructorReferralRate}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, instructorReferralRate: parseInt(e.target.value) || 0 })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-green-700">PF手数料: {100 - platformSettings.instructorReferralRate}%</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <label className="text-sm font-medium text-blue-800">プラットフォーム集客</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={platformSettings.platformAcquisitionRate}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, platformAcquisitionRate: parseInt(e.target.value) || 0 })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-blue-700">PF手数料: {100 - platformSettings.platformAcquisitionRate}%</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                    <label className="text-sm font-medium text-purple-800">アフィリエイト経由</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={platformSettings.affiliateRate}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, affiliateRate: parseInt(e.target.value) || 0 })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-purple-700">PF手数料: {100 - platformSettings.affiliateRate}%（うちアフィリエイター{platformSettings.affiliatorShare}%）</p>
                  </div>
                </div>
              </div>

              {/* 支払い設定 */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-4">支払い設定</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">最低支払い金額</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                        <Input
                          type="number"
                          min="0"
                          value={platformSettings.minimumPayoutAmount}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, minimumPayoutAmount: parseInt(e.target.value) || 0 })}
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-gray-500">この金額未満の場合は翌月に繰り越し</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">支払いサイクル</label>
                      <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                        月末締め、翌月末払い
                      </div>
                      <p className="text-xs text-gray-500">例: 1月分（1/1-1/31）→ 2月末日支払い</p>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 font-medium">
                      <CheckCircle className="h-4 w-4" />
                      振込手数料はプラットフォーム負担
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      講師への振込時に発生する銀行振込手数料は、すべてプラットフォームが負担します。
                    </p>
                  </div>
                </div>
              </div>

              {/* 収益分配の仕組み */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-4">収益分配の仕組み</h3>
                
                <div className="space-y-4">
                  {/* PPV */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4" />
                      PPV（単品購入）
                    </h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>流入経路に応じた分配率を適用:</strong></p>
                      <ul className="list-disc list-inside pl-2">
                        <li>講師自身の集客（紹介リンク経由）: 講師 {platformSettings.instructorReferralRate}% / PF {100 - platformSettings.instructorReferralRate}%</li>
                        <li>プラットフォーム集客: 講師 {platformSettings.platformAcquisitionRate}% / PF {100 - platformSettings.platformAcquisitionRate}%</li>
                        <li>アフィリエイト経由: 講師 {platformSettings.affiliateRate}% / PF {100 - platformSettings.affiliateRate}%（うちアフィリエイター {platformSettings.affiliatorShare}%）</li>
                      </ul>
                    </div>
                  </div>

                  {/* パッケージ */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-medium text-orange-900 flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4" />
                      パッケージ販売
                    </h4>
                    <div className="text-sm text-orange-700 space-y-2">
                      <p><strong>各コースの定価比率で按分し、PPVと同様の分配率を適用</strong></p>
                      <p className="bg-orange-100 p-2 rounded">
                        例: コースA(¥10,000/講師X) + コースB(¥20,000/講師Y) = 定価合計¥30,000<br />
                        パッケージを¥24,000でプラットフォーム集客（60%）で販売した場合:<br />
                        → コースA: ¥24,000 × (10,000/30,000) = ¥8,000 → 講師X取り分 ¥4,800<br />
                        → コースB: ¥24,000 × (20,000/30,000) = ¥16,000 → 講師Y取り分 ¥9,600
                      </p>
                    </div>
                  </div>

                  {/* サブスク */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4" />
                      サブスクリプション
                    </h4>
                    <div className="text-sm text-purple-700 space-y-2">
                      <p><strong>視聴時間按分方式</strong></p>
                      <ul className="list-disc list-inside pl-2">
                        <li>講師プール: サブスク総収益の60%</li>
                        <li>プラットフォーム: 40%</li>
                        <li>各講師の取り分 = 講師プール × (その講師の総視聴時間 / 全講師の総視聴時間)</li>
                      </ul>
                      <p className="bg-purple-100 p-2 rounded mt-2">
                        <strong>ベーシックインカム型分配:</strong><br />
                        講師プール（60%）のうち10%を「ベーシックインカムプール」として確保し、全講師に均等分配。
                        残り90%を視聴時間按分。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button>設定を保存</Button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {(activeTab === 'overview' || activeTab === 'pending' || activeTab === 'history' || activeTab === 'ppv-details') && pagination.totalPages > 1 && (
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && selectedInstructor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">支払い処理</h3>
              <button onClick={() => setShowPayoutModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">講師</p>
                <p className="font-medium text-gray-900">{selectedInstructor.instructorName}</p>
                <p className="text-sm text-gray-500">{selectedInstructor.instructorEmail}</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">未払い残高の内訳</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">PPV売上分:</span>
                    <span className="font-medium text-blue-900">¥{Math.floor(selectedInstructor.pendingBalance * 0.5).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">パッケージ分:</span>
                    <span className="font-medium text-blue-900">¥{Math.floor(selectedInstructor.pendingBalance * 0.2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">サブスク分配分:</span>
                    <span className="font-medium text-blue-900">¥{Math.floor(selectedInstructor.pendingBalance * 0.3).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                    <span className="text-blue-700">合計:</span>
                    <span className="font-bold text-blue-900">¥{selectedInstructor.pendingBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">支払い金額</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <Input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="pl-8"
                    max={selectedInstructor.pendingBalance}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  未払い残高: ¥{selectedInstructor.pendingBalance.toLocaleString()}
                </p>
              </div>

              {parseInt(payoutAmount) > 0 && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">振込手数料:</span>
                    <span className="font-medium text-green-800">プラットフォーム負担（講師負担なし）</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t border-green-200">
                    <span className="text-green-700">実際の振込額:</span>
                    <span className="font-bold text-green-900">
                      ¥{parseInt(payoutAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowPayoutModal(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleProcessPayout} disabled={processing || !payoutAmount}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  支払いを実行
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Rate Modal */}
      {showRateModal && selectedInstructor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">分配率の変更</h3>
              <button onClick={() => setShowRateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">講師</p>
                <p className="font-medium text-gray-900">{selectedInstructor.instructorName}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">講師分配率</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500">
                  プラットフォーム手数料: {100 - (parseInt(newCommissionRate) || 0)}%
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowRateModal(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleUpdateCommissionRate} disabled={processing}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  更新する
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

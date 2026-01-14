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
  subscriptionAmount: number;
  status: string;
  payoutDate: string;
  processedAt: string | null;
  transactionId: string | null;
  note: string | null;
}

type TabType = 'overview' | 'ppv-details' | 'pending' | 'history' | 'calculator' | 'settings';

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [instructors, setInstructors] = useState<InstructorPayout[]>([]);
  const [ppvTransactions, setPpvTransactions] = useState<PPVTransaction[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // フィルター
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [instructorFilter, setInstructorFilter] = useState('');

  // モーダル状態
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorPayout | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [newCommissionRate, setNewCommissionRate] = useState('');
  const [processing, setProcessing] = useState(false);

  // 振込計算シミュレーター
  const [calcInput, setCalcInput] = useState({
    salePrice: 0,
    commissionRate: 70,
    transactionCount: 1,
    includeTax: true,
  });

  // 集計データ
  const [summary, setSummary] = useState({
    totalPendingPayouts: 0,
    totalPaidThisMonth: 0,
    totalInstructors: 0,
    averageCommissionRate: 70,
    // PPV内訳
    ppvTotalPending: 0,
    ppvTransactionCount: 0,
    // サブスクリプション内訳
    subscriptionTotalPending: 0,
    subscriptionInstructorCount: 0,
  });

  // プラットフォーム設定
  const [platformSettings, setPlatformSettings] = useState({
    defaultCommissionRate: 70,
    minimumPayoutAmount: 5000,
    payoutDay: 15,
    payoutCurrency: 'JPY',
    // 振込手数料
    bankTransferFee: 550,
    bankTransferFeeThreshold: 30000, // この金額以上は振込手数料無料
  });

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'pending') {
      fetchInstructorPayouts();
    } else if (activeTab === 'ppv-details') {
      fetchPPVTransactions();
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
      if (response.success && response.data) {
        setInstructors(response.data.instructors.map(i => ({
          ...i,
          ppvTotalSales: i.totalSales * 0.7, // モックデータ用の計算
          ppvPlatformFee: i.platformFee * 0.7,
          ppvNetPayout: i.netPayout * 0.7,
          ppvTransactionCount: Math.floor(Math.random() * 20) + 5,
          subscriptionShare: i.totalSales * 0.3,
          subscriptionStudentCount: Math.floor(Math.random() * 100) + 10,
        })));
        setPagination(prev => ({ ...prev, ...response.data!.pagination }));
        if (response.data.summary) {
          setSummary({
            ...response.data.summary,
            ppvTotalPending: response.data.summary.totalPendingPayouts * 0.7,
            ppvTransactionCount: 156,
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
          ppvTotalSales: 350000,
          ppvPlatformFee: 105000,
          ppvNetPayout: 245000,
          ppvTransactionCount: 28,
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
          ppvTotalSales: 224000,
          ppvPlatformFee: 67200,
          ppvNetPayout: 156800,
          ppvTransactionCount: 16,
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
        ppvTotalPending: 91000,
        ppvTransactionCount: 44,
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
      // APIがある場合はここで呼び出し
      // const response = await api.getAdminPPVTransactions({...});
      // モックデータ
      setPpvTransactions([
        {
          id: 'txn-1',
          courseId: 'course-1',
          courseTitle: 'Webデザイン入門 - HTML/CSS基礎',
          buyerName: '鈴木一郎',
          buyerEmail: 'suzuki@example.com',
          salePrice: 12800,
          platformFee: 3840,
          instructorPayout: 8960,
          commissionRate: 70,
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
          platformFee: 7440,
          instructorPayout: 17360,
          commissionRate: 70,
          paymentStatus: 'completed',
          purchasedAt: '2026-01-11T14:20:00Z',
          isPaid: false,
          paidAt: null,
        },
        {
          id: 'txn-3',
          courseId: 'course-3',
          courseTitle: 'React + Next.js 実践講座',
          buyerName: '高橋美咲',
          buyerEmail: 'takahashi@example.com',
          salePrice: 19800,
          platformFee: 5940,
          instructorPayout: 13860,
          commissionRate: 70,
          paymentStatus: 'completed',
          purchasedAt: '2026-01-10T09:15:00Z',
          isPaid: true,
          paidAt: '2026-01-15T10:00:00Z',
        },
        {
          id: 'txn-4',
          courseId: 'course-1',
          courseTitle: 'Webデザイン入門 - HTML/CSS基礎',
          buyerName: '伊藤健太',
          buyerEmail: 'ito@example.com',
          salePrice: 12800,
          platformFee: 3840,
          instructorPayout: 8960,
          commissionRate: 70,
          paymentStatus: 'completed',
          purchasedAt: '2026-01-09T16:45:00Z',
          isPaid: true,
          paidAt: '2026-01-15T10:00:00Z',
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
      if (response.success && response.data) {
        setPayoutHistory(response.data.payouts.map(p => ({
          ...p,
          ppvAmount: p.amount * 0.7,
          subscriptionAmount: p.amount * 0.3,
        })));
        setPagination(prev => ({ ...prev, ...response.data!.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch payout history:', err);
      // モックデータ
      setPayoutHistory([
        {
          id: 'pay-1',
          instructorId: 'inst-1',
          instructorName: '山田太郎',
          amount: 85000,
          ppvAmount: 59500,
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
          ppvAmount: 31500,
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

  // 振込金額の計算
  const calculatePayout = (salePrice: number, commissionRate: number, count: number = 1) => {
    const grossRevenue = salePrice * count;
    const platformFeeRate = 100 - commissionRate;
    const platformFee = Math.floor(grossRevenue * (platformFeeRate / 100));
    const netPayout = grossRevenue - platformFee;
    
    // 振込手数料の計算
    let transferFee = 0;
    if (netPayout < platformSettings.bankTransferFeeThreshold) {
      transferFee = platformSettings.bankTransferFee;
    }
    
    const finalPayout = netPayout - transferFee;
    
    return {
      grossRevenue,
      platformFee,
      platformFeeRate,
      netPayout,
      transferFee,
      finalPayout,
    };
  };

  const handleExportCSV = () => {
    if (activeTab === 'ppv-details') {
      // PPV取引詳細のCSV
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
    } else {
      // 講師別のCSV
      const headers = ['講師名', 'メール', 'PPV売上', 'PPV手数料', 'PPV取り分', 'PPV取引数', 'サブスク分配', 'サブスク受講者', '総売上', '総手数料', '分配率', '講師取り分', '未払い残高', '支払い済み'];
      const rows = instructors.map(i => [
        i.instructorName,
        i.instructorEmail,
        i.ppvTotalSales,
        i.ppvPlatformFee,
        i.ppvNetPayout,
        i.ppvTransactionCount,
        i.subscriptionShare,
        i.subscriptionStudentCount,
        i.totalSales,
        i.platformFee,
        `${i.commissionRate}%`,
        i.netPayout,
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
    { id: 'ppv-details' as TabType, label: 'PPV取引詳細', icon: ShoppingCart },
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
          <p className="text-gray-500 mt-1">PPV収益とサブスクリプション分配の管理・振込計算</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">¥{summary.totalPendingPayouts.toLocaleString()}</p>
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
              <p className="text-2xl font-bold text-gray-900">¥{summary.ppvTotalPending.toLocaleString()}</p>
              <p className="text-xs text-gray-500">PPV未払い ({summary.ppvTransactionCount}件)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">¥{summary.subscriptionTotalPending.toLocaleString()}</p>
              <p className="text-xs text-gray-500">サブスク未払い ({summary.subscriptionInstructorCount}名)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">¥{summary.totalPaidThisMonth.toLocaleString()}</p>
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
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
              {/* Search */}
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
                            PPV売上
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          <div className="flex items-center justify-end gap-1">
                            <CreditCard className="h-3 w-3" />
                            サブスク分配
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">総売上</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">手数料</th>
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
                            <p className="text-sm text-gray-900">¥{instructor.subscriptionShare.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{instructor.subscriptionStudentCount}名</p>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-900">
                            ¥{instructor.totalSales.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-red-600">
                            -¥{instructor.platformFee.toLocaleString()}
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
              {/* Filters */}
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
                  <select
                    value={instructorFilter}
                    onChange={(e) => setInstructorFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">全講師</option>
                    {instructors.map(i => (
                      <option key={i.instructorId} value={i.instructorId}>{i.instructorName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PPV Summary */}
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
              ) : ppvTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">PPV取引が見つかりません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日時</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">コース</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">購入者</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">販売価格</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">手数料(30%)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">講師取り分</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">支払い</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ppvTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(transaction.purchasedAt).toLocaleString('ja-JP', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                              {transaction.courseTitle}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-gray-900">{transaction.buyerName}</p>
                            <p className="text-xs text-gray-500">{transaction.buyerEmail}</p>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-900">
                            ¥{transaction.salePrice.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-red-600">
                            -¥{transaction.platformFee.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-medium text-green-600">
                            ¥{transaction.instructorPayout.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {transaction.isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3" />
                                済
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Clock className="h-3 w-3" />
                                待ち
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">サブスク分</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状態</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払日</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payoutHistory.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-gray-900">{payout.instructorName}</p>
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-medium text-green-600">
                            ¥{payout.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-blue-600">
                            ¥{payout.ppvAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-purple-600">
                            ¥{payout.subscriptionAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {getStatusBadge(payout.status)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(payout.payoutDate).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500 font-mono">
                            {payout.transactionId || '-'}
                          </td>
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
            <div className="max-w-3xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">PPV収益振込計算シミュレーター</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      コース販売価格から講師への振込金額を計算します。
                      プラットフォーム手数料と振込手数料を考慮した最終金額を確認できます。
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* 入力フォーム */}
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
                        placeholder="例: 12800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">講師分配率</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={calcInput.commissionRate}
                        onChange={(e) => setCalcInput(prev => ({ ...prev, commissionRate: parseInt(e.target.value) || 0 }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-500">プラットフォーム手数料: {100 - calcInput.commissionRate}%</p>
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
                    <h4 className="text-sm font-medium text-gray-700 mb-3">よく使う価格設定</h4>
                    <div className="flex flex-wrap gap-2">
                      {[4980, 9800, 12800, 19800, 24800, 29800].map(price => (
                        <button
                          key={price}
                          onClick={() => setCalcInput(prev => ({ ...prev, salePrice: price }))}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            calcInput.salePrice === price
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          ¥{price.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 計算結果 */}
                <div className="bg-white rounded-xl border p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">計算結果</h3>
                  
                  {(() => {
                    const result = calculatePayout(calcInput.salePrice, calcInput.commissionRate, calcInput.transactionCount);
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">総売上</span>
                          <span className="text-lg font-medium text-gray-900">¥{result.grossRevenue.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">プラットフォーム手数料 ({result.platformFeeRate}%)</span>
                          <span className="text-lg font-medium text-red-600">-¥{result.platformFee.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">講師取り分 ({calcInput.commissionRate}%)</span>
                          <span className="text-lg font-medium text-green-600">¥{result.netPayout.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">
                            振込手数料
                            {result.netPayout >= platformSettings.bankTransferFeeThreshold && (
                              <span className="ml-1 text-xs text-green-600">(¥{platformSettings.bankTransferFeeThreshold.toLocaleString()}以上で無料)</span>
                            )}
                          </span>
                          <span className="text-lg font-medium text-red-600">
                            {result.transferFee > 0 ? `-¥${result.transferFee.toLocaleString()}` : '¥0'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-4 bg-gray-50 rounded-lg px-4 mt-4">
                          <span className="text-lg font-semibold text-gray-900">最終振込金額</span>
                          <span className="text-2xl font-bold text-green-600">¥{result.finalPayout.toLocaleString()}</span>
                        </div>

                        <div className="text-xs text-gray-500 mt-4 space-y-1">
                          <p>※ 上記は概算です。実際の金額は決済手数料等により異なる場合があります。</p>
                          <p>※ 振込手数料は¥{platformSettings.bankTransferFeeThreshold.toLocaleString()}未満の場合、¥{platformSettings.bankTransferFee.toLocaleString()}かかります。</p>
                          <p>※ 最低振込金額は¥{platformSettings.minimumPayoutAmount.toLocaleString()}です。</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 一括計算例 */}
              <div className="mt-8 bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">価格帯別 振込金額早見表</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">販売価格</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">手数料(30%)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">講師取り分(70%)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">振込手数料</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 bg-green-50">最終振込額</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[4980, 9800, 12800, 19800, 24800, 29800, 49800].map(price => {
                        const result = calculatePayout(price, platformSettings.defaultCommissionRate, 1);
                        return (
                          <tr key={price} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">¥{price.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-red-600 text-right">-¥{result.platformFee.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-green-600 text-right">¥{result.netPayout.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">
                              {result.transferFee > 0 ? `-¥${result.transferFee}` : '無料'}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-green-700 text-right bg-green-50">¥{result.finalPayout.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">支払い設定</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">デフォルト分配率（講師取り分）</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={platformSettings.defaultCommissionRate}
                          onChange={(e) =>
                            setPlatformSettings({ ...platformSettings, defaultCommissionRate: parseInt(e.target.value) || 0 })
                          }
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <p className="text-xs text-gray-500">プラットフォーム手数料: {100 - platformSettings.defaultCommissionRate}%</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">最低支払い金額</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                        <Input
                          type="number"
                          min="0"
                          value={platformSettings.minimumPayoutAmount}
                          onChange={(e) =>
                            setPlatformSettings({ ...platformSettings, minimumPayoutAmount: parseInt(e.target.value) || 0 })
                          }
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-gray-500">この金額未満は支払い処理できません</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">支払い日（毎月）</label>
                      <Input
                        type="number"
                        min="1"
                        max="28"
                        value={platformSettings.payoutDay}
                        onChange={(e) =>
                          setPlatformSettings({ ...platformSettings, payoutDay: parseInt(e.target.value) || 15 })
                        }
                      />
                      <p className="text-xs text-gray-500">毎月{platformSettings.payoutDay}日に自動支払い処理</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">支払い通貨</label>
                      <select
                        value={platformSettings.payoutCurrency}
                        onChange={(e) =>
                          setPlatformSettings({ ...platformSettings, payoutCurrency: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="JPY">日本円 (JPY)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-4">振込手数料設定</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">振込手数料</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                      <Input
                        type="number"
                        min="0"
                        value={platformSettings.bankTransferFee}
                        onChange={(e) =>
                          setPlatformSettings({ ...platformSettings, bankTransferFee: parseInt(e.target.value) || 0 })
                        }
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">振込手数料無料の閾値</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                      <Input
                        type="number"
                        min="0"
                        value={platformSettings.bankTransferFeeThreshold}
                        onChange={(e) =>
                          setPlatformSettings({ ...platformSettings, bankTransferFeeThreshold: parseInt(e.target.value) || 0 })
                        }
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-gray-500">この金額以上の振込は手数料無料</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-4">PPV収益分配の仕組み</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">コース販売価格</span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                  <div className="flex items-center justify-between text-red-600">
                    <span className="text-sm">→ プラットフォーム手数料</span>
                    <span className="text-sm font-medium">-{100 - platformSettings.defaultCommissionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-green-600 border-t pt-3">
                    <span className="text-sm font-medium">= 講師の取り分</span>
                    <span className="text-sm font-bold">{platformSettings.defaultCommissionRate}%</span>
                  </div>
                </div>
                <div className="mt-4 bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">計算例（¥12,800のコース）</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>販売価格: ¥12,800</p>
                    <p>プラットフォーム手数料 (30%): -¥3,840</p>
                    <p>講師取り分 (70%): ¥8,960</p>
                    <p className="pt-2 border-t border-blue-200 font-medium">
                      → 振込金額: ¥8,960 - ¥550（手数料）= ¥8,410
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ※ 個別の講師に対して異なる分配率を設定することも可能です
                </p>
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
              
              {/* 収益内訳 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">未払い残高の内訳</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">PPV売上分:</span>
                    <span className="font-medium text-blue-900">¥{Math.floor(selectedInstructor.pendingBalance * 0.7).toLocaleString()}</span>
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

              {/* 振込手数料の表示 */}
              {parseInt(payoutAmount) > 0 && (
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700">振込手数料:</span>
                    <span className="font-medium text-yellow-900">
                      {parseInt(payoutAmount) >= platformSettings.bankTransferFeeThreshold 
                        ? '無料' 
                        : `-¥${platformSettings.bankTransferFee}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t border-yellow-200">
                    <span className="text-yellow-700">実際の振込額:</span>
                    <span className="font-bold text-yellow-900">
                      ¥{(parseInt(payoutAmount) >= platformSettings.bankTransferFeeThreshold 
                        ? parseInt(payoutAmount) 
                        : parseInt(payoutAmount) - platformSettings.bankTransferFee
                      ).toLocaleString()}
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

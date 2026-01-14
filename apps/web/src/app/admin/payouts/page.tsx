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
  User,
  Settings,
  TrendingUp,
  FileText,
  Send,
  Edit,
  X,
  Check,
} from 'lucide-react';

interface InstructorPayout {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
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

interface PayoutHistory {
  id: string;
  instructorId: string;
  instructorName: string;
  amount: number;
  status: string;
  payoutDate: string;
  processedAt: string | null;
  transactionId: string | null;
  note: string | null;
}

type TabType = 'overview' | 'pending' | 'history' | 'settings';

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [instructors, setInstructors] = useState<InstructorPayout[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // モーダル状態
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorPayout | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [newCommissionRate, setNewCommissionRate] = useState('');
  const [processing, setProcessing] = useState(false);

  // 集計データ
  const [summary, setSummary] = useState({
    totalPendingPayouts: 0,
    totalPaidThisMonth: 0,
    totalInstructors: 0,
    averageCommissionRate: 70,
  });

  // プラットフォーム設定
  const [platformSettings, setPlatformSettings] = useState({
    defaultCommissionRate: 70,
    minimumPayoutAmount: 5000,
    payoutDay: 15,
    payoutCurrency: 'JPY',
  });

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'pending') {
      fetchInstructorPayouts();
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
        setInstructors(response.data.instructors);
        setPagination(prev => ({ ...prev, ...response.data!.pagination }));
        if (response.data.summary) {
          setSummary(response.data.summary);
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
      });
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
        setPayoutHistory(response.data.payouts);
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

  const handleExportCSV = () => {
    const headers = ['講師名', 'メール', '総売上', 'プラットフォーム手数料', '分配率', '講師取り分', '未払い残高', '支払い済み'];
    const rows = instructors.map(i => [
      i.instructorName,
      i.instructorEmail,
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
  };

  const tabs = [
    { id: 'overview' as TabType, label: '概要', icon: TrendingUp },
    { id: 'pending' as TabType, label: '支払い待ち', icon: Clock },
    { id: 'history' as TabType, label: '支払い履歴', icon: FileText },
    { id: 'settings' as TabType, label: '設定', icon: Settings },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">講師収益分配</h1>
          <p className="text-gray-500 mt-1">講師への収益分配と支払いを管理</p>
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
            <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">¥{summary.totalPaidThisMonth.toLocaleString()}</p>
              <p className="text-xs text-gray-500">今月の支払い</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalInstructors}</p>
              <p className="text-xs text-gray-500">アクティブ講師</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.averageCommissionRate}%</p>
              <p className="text-xs text-gray-500">平均分配率</p>
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
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">総売上</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">手数料(30%)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">分配率</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">講師取り分</th>
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
                          <td className="px-4 py-4 text-right text-sm font-medium text-green-600">
                            ¥{instructor.netPayout.toLocaleString()}
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
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">収益分配の仕組み</h3>
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
          {(activeTab === 'overview' || activeTab === 'pending' || activeTab === 'history') && pagination.totalPages > 1 && (
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

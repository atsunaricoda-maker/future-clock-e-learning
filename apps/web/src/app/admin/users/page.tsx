'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
  MoreVertical,
  Ban,
  CheckCircle,
  GraduationCap,
  UserCog,
  BookOpen,
  Star,
  Mail,
  Download,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  displayName: string;
  createdAt: string;
  // 講師用追加フィールド
  totalCourses?: number;
  totalStudents?: number;
  totalRevenue?: number;
  averageRating?: number;
  commissionRate?: number;
  // 受講生用追加フィールド
  enrolledCourses?: number;
  completedCourses?: number;
  totalSpent?: number;
}

type TabType = 'all' | 'students' | 'instructors' | 'admins';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [counts, setCounts] = useState({ all: 0, students: 0, instructors: 0, admins: 0 });

  // ロール変更モーダル
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, activeTab, statusFilter]);

  const getRoleFilter = () => {
    switch (activeTab) {
      case 'students': return 'student';
      case 'instructors': return 'instructor';
      case 'admins': return 'admin,super_admin';
      default: return undefined;
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getAdminUsers({
        page: pagination.page,
        limit: pagination.limit,
        role: getRoleFilter(),
        status: statusFilter || undefined,
      });
      if (response.success && response.data) {
        setUsers(response.data.users);
        setPagination(prev => ({ ...prev, ...response.data!.pagination }));
        
        // カウントも取得（簡易的に）
        if ((response.data as any).counts) {
          setCounts((response.data as any).counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      const response = await api.updateUserStatus(userId, status);
      if (response.success) {
        fetchUsers();
        setSelectedUser(null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeUser || !newRole) return;
    try {
      const response = await api.updateUserRole(roleChangeUser.id, newRole);
      if (response.success) {
        fetchUsers();
        setShowRoleModal(false);
        setRoleChangeUser(null);
        setNewRole('');
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      student: '受講生',
      instructor: '講師',
      admin: '管理者',
      super_admin: 'スーパー管理者',
    };
    return labels[role] || role;
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { className: string; icon: React.ReactNode }> = {
      student: { className: 'bg-blue-100 text-blue-800', icon: <GraduationCap className="h-3 w-3" /> },
      instructor: { className: 'bg-purple-100 text-purple-800', icon: <BookOpen className="h-3 w-3" /> },
      admin: { className: 'bg-orange-100 text-orange-800', icon: <Shield className="h-3 w-3" /> },
      super_admin: { className: 'bg-red-100 text-red-800', icon: <Shield className="h-3 w-3" /> },
    };
    const badge = badges[role] || { className: 'bg-gray-100 text-gray-800', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.icon}
        {getRoleLabel(role)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: { label: 'アクティブ', className: 'bg-green-100 text-green-800' },
      suspended: { label: '停止中', className: 'bg-red-100 text-red-800' },
      pending: { label: '保留中', className: 'bg-yellow-100 text-yellow-800' },
      deleted: { label: '削除済み', className: 'bg-gray-100 text-gray-800' },
    };
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const handleExportCSV = () => {
    const headers = ['名前', 'メール', 'ロール', 'ステータス', '登録日'];
    const rows = users.map(u => [
      u.displayName || '未設定',
      u.email,
      getRoleLabel(u.role),
      u.status,
      new Date(u.createdAt).toLocaleDateString('ja-JP')
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const tabs = [
    { id: 'all' as TabType, label: 'すべて', icon: Users, count: counts.all || pagination.total },
    { id: 'students' as TabType, label: '受講生', icon: GraduationCap, count: counts.students },
    { id: 'instructors' as TabType, label: '講師', icon: BookOpen, count: counts.instructors },
    { id: 'admins' as TabType, label: '管理者', icon: Shield, count: counts.admins },
  ];

  // 講師用の追加カラム
  const renderInstructorColumns = (u: User) => (
    <>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
        <div className="flex items-center gap-1">
          <BookOpen className="h-4 w-4 text-gray-400" />
          {u.totalCourses || 0}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-400" />
          {u.totalStudents || 0}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-400" />
          {u.averageRating?.toFixed(1) || '-'}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
        ¥{(u.totalRevenue || 0).toLocaleString()}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
        {u.commissionRate || 70}%
      </td>
    </>
  );

  // 受講生用の追加カラム
  const renderStudentColumns = (u: User) => (
    <>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
        {u.enrolledCourses || 0}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
        {u.completedCourses || 0}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
        ¥{(u.totalSpent || 0).toLocaleString()}
      </td>
    </>
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-500 mt-1">プラットフォームのユーザーを管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
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
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50/50">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="メールアドレスまたは名前で検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">すべてのステータス</option>
              <option value="active">アクティブ</option>
              <option value="suspended">停止中</option>
              <option value="pending">保留中</option>
            </select>
            <Button onClick={handleSearch}>検索</Button>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">ユーザーが見つかりません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  {activeTab === 'all' && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ロール
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  {activeTab === 'instructors' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        コース数
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        受講生数
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        評価
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        総売上
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        分配率
                      </th>
                    </>
                  )}
                  {activeTab === 'students' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        受講中
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        修了
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        累計支払
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {(u.displayName || u.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {u.displayName || '名前未設定'}
                          </p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {activeTab === 'all' && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getRoleBadge(u.role)}
                      </td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(u.status)}
                    </td>
                    {activeTab === 'instructors' && renderInstructorColumns(u)}
                    {activeTab === 'students' && renderStudentColumns(u)}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)}
                          className="p-2 rounded hover:bg-gray-100"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </button>
                        {selectedUser === u.id && (
                          <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setRoleChangeUser(u);
                                  setNewRole(u.role);
                                  setShowRoleModal(true);
                                  setSelectedUser(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <UserCog className="h-4 w-4" />
                                ロールを変更
                              </button>
                              <button
                                onClick={() => {
                                  window.location.href = `mailto:${u.email}`;
                                  setSelectedUser(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Mail className="h-4 w-4" />
                                メールを送信
                              </button>
                              <div className="border-t my-1" />
                              {u.status !== 'active' && (
                                <button
                                  onClick={() => handleStatusChange(u.id, 'active')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-50"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  アクティブにする
                                </button>
                              )}
                              {u.status !== 'suspended' && (
                                <button
                                  onClick={() => handleStatusChange(u.id, 'suspended')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                                >
                                  <Ban className="h-4 w-4" />
                                  停止する
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
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
              <span className="flex items-center px-3 text-sm text-gray-600">
                {pagination.page} / {pagination.totalPages}
              </span>
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

      {/* Role Change Modal */}
      {showRoleModal && roleChangeUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ロールを変更</h3>
            <p className="text-sm text-gray-500 mb-4">
              {roleChangeUser.displayName || roleChangeUser.email} のロールを変更します
            </p>
            <div className="space-y-3 mb-6">
              {[
                { value: 'student', label: '受講生', description: 'コースを受講できます' },
                { value: 'instructor', label: '講師', description: 'コースを作成・販売できます' },
                { value: 'admin', label: '管理者', description: 'プラットフォームを管理できます' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    newRole === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={newRole === option.value}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                キャンセル
              </Button>
              <Button onClick={handleRoleChange} disabled={newRole === roleChangeUser.role}>
                変更する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

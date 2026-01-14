'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { 
  Ticket, 
  Plus, 
  Percent, 
  DollarSign, 
  Calendar, 
  Users, 
  X,
  Copy,
  Check
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  courseId: string;
  courseTitle: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  createdAt: string;
}

interface Course {
  id: string;
  title: string;
}

export default function InstructorCouponsPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    courseId: '',
    maxUses: 0,
    maxUsesPerUser: 1,
    validFrom: '',
    validUntil: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/sign-in');
      } else if (user?.role !== 'instructor' && user?.role !== 'admin' && user?.role !== 'super_admin') {
        router.push('/dashboard');
      } else {
        loadCoupons();
        loadCourses();
      }
    }
  }, [isAuthenticated, authLoading, user, router]);

  const loadCoupons = async () => {
    setIsLoading(true);
    const response = await api.getCoupons();
    if (response.success && response.data) {
      setCoupons((response.data as any).coupons);
    }
    setIsLoading(false);
  };

  const loadCourses = async () => {
    const response = await api.getInstructorCourses();
    if (response.success && response.data) {
      setCourses(response.data.courses);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      alert('クーポンコードを入力してください');
      return;
    }

    setIsSubmitting(true);
    const response = await api.createCoupon({
      code: formData.code,
      description: formData.description || undefined,
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      courseId: formData.courseId || undefined,
      maxUses: formData.maxUses || undefined,
      maxUsesPerUser: formData.maxUsesPerUser || undefined,
      validFrom: formData.validFrom || undefined,
      validUntil: formData.validUntil || undefined,
    });

    if (response.success) {
      setShowModal(false);
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        courseId: '',
        maxUses: 0,
        maxUsesPerUser: 1,
        validFrom: '',
        validUntil: '',
      });
      loadCoupons();
    } else {
      alert(response.error?.message || 'クーポンの作成に失敗しました');
    }
    setIsSubmitting(false);
  };

  const toggleCoupon = async (couponId: string, isActive: boolean) => {
    if (isActive) {
      const response = await api.deactivateCoupon(couponId);
      if (response.success) {
        setCoupons(coupons.map(c => c.id === couponId ? { ...c, isActive: false } : c));
      }
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}% OFF`;
    }
    return `¥${coupon.discountValue.toLocaleString()} OFF`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            クーポン管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            割引クーポンを作成・管理します
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規クーポン
        </Button>
      </div>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/30">
          <Ticket className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">クーポンがありません</h2>
          <p className="text-muted-foreground mb-6">
            割引クーポンを作成して、コースの販促に活用しましょう
          </p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            クーポンを作成
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">コード</th>
                <th className="px-4 py-3 text-left text-sm font-medium">割引</th>
                <th className="px-4 py-3 text-left text-sm font-medium">対象コース</th>
                <th className="px-4 py-3 text-left text-sm font-medium">使用状況</th>
                <th className="px-4 py-3 text-left text-sm font-medium">有効期限</th>
                <th className="px-4 py-3 text-left text-sm font-medium">状態</th>
                <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold bg-muted px-2 py-1 rounded">
                        {coupon.code}
                      </code>
                      <button
                        onClick={() => copyCode(coupon.code, coupon.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === coupon.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                      coupon.discountType === 'percentage' 
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {coupon.discountType === 'percentage' ? (
                        <Percent className="h-3 w-3" />
                      ) : (
                        <DollarSign className="h-3 w-3" />
                      )}
                      {formatDiscount(coupon)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {coupon.courseTitle || '全コース'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {coupon.usedCount}
                      {coupon.maxUses > 0 && ` / ${coupon.maxUses}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {coupon.validUntil ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(coupon.validUntil)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">無期限</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      coupon.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {coupon.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {coupon.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCoupon(coupon.id, coupon.isActive)}
                      >
                        無効化
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">新規クーポン作成</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  クーポンコード <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2026"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    自動生成
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">説明（任意）</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="夏季限定キャンペーン"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium mb-1">割引タイプ</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discountType: 'percentage' })}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      formData.discountType === 'percentage'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Percent className="h-4 w-4 mx-auto mb-1" />
                    割合
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discountType: 'fixed' })}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      formData.discountType === 'fixed'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <DollarSign className="h-4 w-4 mx-auto mb-1" />
                    固定額
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  割引{formData.discountType === 'percentage' ? '率（%）' : '額（円）'}
                </label>
                <Input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={formData.discountType === 'percentage' ? 100 : undefined}
                />
              </div>

              {/* Course */}
              <div>
                <label className="block text-sm font-medium mb-1">対象コース（任意）</label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                >
                  <option value="">全コース対象</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Uses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">使用上限（0=無制限）</label>
                  <Input
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">1人あたり上限</label>
                  <Input
                    type="number"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => setFormData({ ...formData, maxUsesPerUser: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                </div>
              </div>

              {/* Valid Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">開始日（任意）</label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">終了日（任意）</label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting || !formData.code.trim()}>
                  {isSubmitting ? '作成中...' : '作成する'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

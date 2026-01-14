'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck,
  BookOpen,
  Star,
  MessageCircle,
  CreditCard,
  Award,
  Info,
  AlertCircle,
  Gift,
  Megaphone
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  course_enrolled: <BookOpen className="h-5 w-5 text-blue-500" />,
  course_completed: <Award className="h-5 w-5 text-green-500" />,
  new_review: <Star className="h-5 w-5 text-yellow-500" />,
  question_answered: <MessageCircle className="h-5 w-5 text-purple-500" />,
  payment_success: <CreditCard className="h-5 w-5 text-emerald-500" />,
  course_approved: <Check className="h-5 w-5 text-green-500" />,
  course_rejected: <AlertCircle className="h-5 w-5 text-red-500" />,
  promotion: <Gift className="h-5 w-5 text-pink-500" />,
  announcement: <Megaphone className="h-5 w-5 text-orange-500" />,
  default: <Info className="h-5 w-5 text-muted-foreground" />,
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/sign-in');
      } else {
        loadNotifications();
        loadUnreadCount();
      }
    }
  }, [isAuthenticated, authLoading, router, filter]);

  const loadNotifications = async () => {
    setIsLoading(true);
    const response = await api.getNotifications({
      unreadOnly: filter === 'unread',
      limit: 20,
    });
    if (response.success && response.data) {
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
      setPagination(response.data.pagination);
    }
    setIsLoading(false);
  };

  const loadUnreadCount = async () => {
    const response = await api.getUnreadCount();
    if (response.success && response.data) {
      setUnreadCount(response.data.count);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const response = await api.markNotificationRead(notificationId);
    if (response.success) {
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const response = await api.markAllNotificationsRead();
    if (response.success) {
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getNotificationIcon = (type: string) => {
    return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="h-6 w-6" />
                通知
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {unreadCount > 0 ? `${unreadCount}件の未読通知があります` : '全ての通知を確認済みです'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                全て既読にする
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              全て
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              未読のみ
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="text-center py-16 bg-background rounded-xl border">
              <BellOff className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">通知はありません</h2>
              <p className="text-muted-foreground">
                {filter === 'unread'
                  ? '未読の通知はありません'
                  : '新しい通知が届くとここに表示されます'}
              </p>
            </div>
          ) : (
            <div className="bg-background rounded-xl border overflow-hidden divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full flex items-start gap-4 p-4 text-left hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  前へ
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

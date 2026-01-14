'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  Calendar,
  BarChart3,
  Loader2
} from 'lucide-react';

export default function LearningHistoryPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      if (!hasToken) {
        window.location.href = '/sign-in?redirect=/dashboard/history';
      }
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const weeklyData = [
    { day: '月', hours: 2.5 },
    { day: '火', hours: 1.0 },
    { day: '水', hours: 3.0 },
    { day: '木', hours: 0.5 },
    { day: '金', hours: 2.0 },
    { day: '土', hours: 4.0 },
    { day: '日', hours: 1.5 },
  ];

  const maxHours = Math.max(...weeklyData.map(d => d.hours));

  const activities = [
    {
      id: 1,
      type: 'lesson_complete',
      course: 'Pythonで学ぶAI入門',
      lesson: 'ニューラルネットワークの基礎',
      duration: '25分',
      time: '2時間前',
      date: '2026年1月14日',
    },
    {
      id: 2,
      type: 'quiz_pass',
      course: 'Webデザインの基礎',
      lesson: 'セクション2 確認テスト',
      score: 90,
      time: '昨日',
      date: '2026年1月13日',
    },
    {
      id: 3,
      type: 'lesson_complete',
      course: 'Pythonで学ぶAI入門',
      lesson: 'データの前処理',
      duration: '30分',
      time: '昨日',
      date: '2026年1月13日',
    },
    {
      id: 4,
      type: 'course_start',
      course: 'ビジネス英語マスター',
      lesson: null,
      time: '3日前',
      date: '2026年1月11日',
    },
    {
      id: 5,
      type: 'certificate',
      course: 'Excel実践講座',
      lesson: null,
      time: '4日前',
      date: '2026年1月10日',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lesson_complete':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'quiz_pass':
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />;
      case 'course_start':
        return <Play className="h-5 w-5 text-purple-600" />;
      case 'certificate':
        return <CheckCircle2 className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActivityText = (activity: typeof activities[0]) => {
    switch (activity.type) {
      case 'lesson_complete':
        return `「${activity.lesson}」を完了しました（${activity.duration}）`;
      case 'quiz_pass':
        return `「${activity.lesson}」に合格しました（${activity.score}点）`;
      case 'course_start':
        return 'コースの受講を開始しました';
      case 'certificate':
        return '修了証を取得しました';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">学習履歴</h1>
        <p className="text-muted-foreground">あなたの学習活動の記録</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">14.5時間</p>
              <p className="text-xs text-muted-foreground">今週の学習時間</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">12レッスン</p>
              <p className="text-xs text-muted-foreground">今週の完了数</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold">7日</p>
              <p className="text-xs text-muted-foreground">連続学習日数</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl font-bold">48時間</p>
              <p className="text-xs text-muted-foreground">総学習時間</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">学習時間の推移</h2>
          <div className="flex gap-2">
            {['week', 'month', 'year'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedPeriod === period
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {period === 'week' ? '週' : period === 'month' ? '月' : '年'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Bar Chart */}
        <div className="flex items-end justify-between h-48 gap-2">
          {weeklyData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex justify-center mb-2">
                <span className="text-xs text-muted-foreground">{data.hours}h</span>
              </div>
              <div 
                className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                style={{ 
                  height: `${(data.hours / maxHours) * 140}px`,
                  minHeight: data.hours > 0 ? '8px' : '0'
                }}
              ></div>
              <span className="text-sm mt-2">{data.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold mb-6">アクティビティ</h2>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/courses/${activity.course}`} className="font-medium hover:text-primary">
                  {activity.course}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {getActivityText(activity)}
                </p>
              </div>
              <span className="text-sm text-muted-foreground flex-shrink-0">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

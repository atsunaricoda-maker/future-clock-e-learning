'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  User, 
  Mail, 
  Calendar,
  BookOpen,
  Award,
  Clock,
  Settings,
  Loader2
} from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/sign-in?redirect=/profile';
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const stats = [
    { label: '受講コース', value: '5', icon: BookOpen },
    { label: '修了証', value: '3', icon: Award },
    { label: '総学習時間', value: '48時間', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <User className="h-12 w-12 text-gray-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <p className="text-gray-500 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
              <Link href="/settings">
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  プロフィールを編集
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Stats */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">学習統計</h2>
              <div className="space-y-4">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h2 className="font-semibold mb-4">アカウント情報</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">アカウント種別</span>
                  <span className="font-medium">
                    {user.role === 'student' ? '受講者' : 
                     user.role === 'instructor' ? '講師' : 
                     user.role === 'admin' ? '管理者' : user.role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">登録日</span>
                  <span className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    2026年1月
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">最近の学習</h2>
              <div className="space-y-4">
                {[
                  { course: 'Pythonで学ぶAI入門', progress: 65, lastAccess: '2時間前' },
                  { course: 'Webデザインの基礎', progress: 30, lastAccess: '昨日' },
                  { course: 'ビジネス英語マスター', progress: 85, lastAccess: '3日前' },
                ].map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{item.course}</h3>
                      <span className="text-sm text-gray-500">{item.lastAccess}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{item.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link href="/dashboard/courses">
                  <Button variant="outline">すべてのコースを見る</Button>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h2 className="font-semibold mb-4">取得した修了証</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: 'Excel実践講座', date: '2026年1月10日' },
                  { title: 'プレゼンテーション入門', date: '2025年12月15日' },
                ].map((cert, index) => (
                  <div key={index} className="p-4 border rounded-lg flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Award className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{cert.title}</p>
                      <p className="text-sm text-gray-500">{cert.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link href="/dashboard/certificates">
                  <Button variant="outline">すべての修了証を見る</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

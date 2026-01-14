'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Clock, Award } from 'lucide-react';
import { api } from '@/lib/api';

interface CourseProgress {
  courseId: string;
  title: string;
  thumbnailUrl: string;
  enrolledAt: string;
  totalLectures: number;
  completedLectures: number;
  progressPercent: number;
  totalWatchTime: number;
  isCompleted: boolean;
}

interface WeeklyStudyData {
  dayOfWeek: string;
  date: string;
  totalMinutes: number;
}

export function ProgressChart() {
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyStudyData[]>([]);
  const [thisWeekTotal, setThisWeekTotal] = useState(0);
  const [lastWeekTotal, setLastWeekTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch course progress
        const progressRes = await api.getMyProgress();
        if (progressRes.success && progressRes.data) {
          setCourses(progressRes.data.courses || []);
        }

        // Fetch weekly study time
        const weeklyRes = await api.getWeeklyStudyTime();
        if (weeklyRes.success && weeklyRes.data) {
          setWeeklyData(weeklyRes.data.weeklyData || []);
          setThisWeekTotal(weeklyRes.data.thisWeekTotal || 0);
          setLastWeekTotal(weeklyRes.data.lastWeekTotal || 0);
        }
      } catch (error) {
        console.error('Failed to fetch progress data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate summary stats
  const totalCourses = courses.length;
  const completedCourses = courses.filter(c => c.isCompleted).length;
  const inProgressCourses = courses.filter(c => !c.isCompleted && c.progressPercent > 0).length;
  const averageProgress = totalCourses > 0
    ? Math.round(courses.reduce((sum, c) => sum + c.progressPercent, 0) / totalCourses)
    : 0;
  
  // Get max for bar chart scaling
  const maxMinutes = Math.max(...weeklyData.map(d => d.totalMinutes), 60);

  // Format minutes to hours and minutes
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
    }
    return `${mins}分`;
  };

  // Calculate week-over-week change
  const weekChange = lastWeekTotal > 0
    ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
    : thisWeekTotal > 0 ? 100 : 0;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-muted rounded-xl"></div>
        <div className="h-48 bg-muted rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Study Time Chart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              週間学習時間
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              今週の合計: <span className="font-semibold text-foreground">{formatTime(thisWeekTotal)}</span>
              {weekChange !== 0 && (
                <span className={`ml-2 ${weekChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({weekChange > 0 ? '+' : ''}{weekChange}% 先週比)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>過去7日間</span>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end justify-between gap-2 h-40">
          {weeklyData.length > 0 ? (
            weeklyData.map((day, index) => {
              const height = (day.totalMinutes / maxMinutes) * 100;
              const isToday = index === weeklyData.length - 1;
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex justify-center">
                    {day.totalMinutes > 0 && (
                      <span className="absolute -top-6 text-xs text-muted-foreground">
                        {formatTime(day.totalMinutes)}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-t-lg relative h-32 flex items-end justify-center">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday ? 'bg-primary' : 'bg-primary/60'
                      }`}
                      style={{ height: `${Math.max(height, day.totalMinutes > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className={`text-xs ${isToday ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    {day.dayOfWeek}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="w-full flex items-center justify-center text-muted-foreground">
              <p>学習データがありません</p>
            </div>
          )}
        </div>
      </div>

      {/* Course Progress Overview */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            コース別進捗
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              完了 ({completedCourses})
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              学習中 ({inProgressCourses})
            </span>
          </div>
        </div>

        {courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.courseId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium truncate flex-1 mr-4">{course.title}</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    {course.isCompleted && <Award className="h-4 w-4 text-yellow-500" />}
                    {course.progressPercent}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      course.isCompleted ? 'bg-green-500' : 'bg-primary'
                    }`}
                    style={{ width: `${course.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{course.completedLectures}/{course.totalLectures} レッスン完了</span>
                  <span>学習時間: {formatTime(Math.round(course.totalWatchTime / 60))}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>受講中のコースがありません</p>
            <a href="/courses" className="text-primary hover:underline text-sm mt-2 inline-block">
              コースを探す →
            </a>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-primary">{totalCourses}</p>
          <p className="text-xs text-muted-foreground">受講コース</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{completedCourses}</p>
          <p className="text-xs text-muted-foreground">完了コース</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-purple-600">{averageProgress}%</p>
          <p className="text-xs text-muted-foreground">平均進捗</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-600">{formatTime(thisWeekTotal)}</p>
          <p className="text-xs text-muted-foreground">今週の学習</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { GraduationCap, User, LogOut, Settings, BookOpen } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">e-Learning</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/courses" className="text-sm font-medium hover:text-primary">
            コース
          </Link>
          <Link href="/instructors" className="text-sm font-medium hover:text-primary">
            講師
          </Link>
          <Link href="/business" className="text-sm font-medium hover:text-primary">
            法人向け
          </Link>
          <Link href="/pricing" className="text-sm font-medium hover:text-primary">
            料金
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  マイ学習
                </Button>
              </Link>
              <div className="relative group">
                <button className="flex items-center space-x-2 rounded-full bg-muted p-2 hover:bg-muted/80">
                  <User className="h-5 w-5" />
                </button>
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-background border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                    >
                      <Settings className="h-4 w-4" />
                      設定
                    </Link>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      ログアウト
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost">ログイン</Button>
              </Link>
              <Link href="/sign-up">
                <Button>新規登録</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

'use client';

export const runtime = 'edge';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { ArrowLeft, Key, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setTokenError('リセットトークンが指定されていません');
      setIsVerifying(false);
    }
  }, [token]);

  const verifyToken = async (t: string) => {
    setIsVerifying(true);
    const response = await api.verifyResetToken(t);
    
    if (response.success && response.data) {
      setEmail(response.data.email);
    } else {
      setTokenError(response.error?.message || 'リセットリンクが無効または期限切れです');
    }
    setIsVerifying(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setIsLoading(true);
    const response = await api.resetPassword(token!, password);
    
    setIsLoading(false);
    
    if (response.success) {
      setIsSubmitted(true);
    } else {
      setError(response.error?.message || 'パスワードのリセットに失敗しました');
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">リンクを確認中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">リンクが無効です</h1>
            <p className="text-gray-600 mb-6">{tokenError}</p>
            <Link href="/forgot-password">
              <Button className="w-full">
                パスワードリセットを再度リクエスト
              </Button>
            </Link>
            <Link href="/sign-in" className="block mt-4">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ログインページに戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">パスワードをリセットしました</h1>
            <p className="text-gray-600 mb-6">
              新しいパスワードでログインしてください。
            </p>
            <Link href="/sign-in">
              <Button className="w-full">
                ログインする
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold">新しいパスワードを設定</h1>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">{email}</span> の<br />
              新しいパスワードを入力してください。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新しいパスワード
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="8文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード（確認）
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="もう一度入力してください"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  リセット中...
                </>
              ) : (
                'パスワードをリセット'
              )}
            </Button>

            <div className="text-center">
              <Link 
                href="/sign-in" 
                className="text-sm text-blue-600 hover:underline inline-flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                ログインページに戻る
              </Link>
            </div>
          </form>
        </div>

        <footer className="text-center text-sm text-gray-400 mt-8">
          © 2026 FutureClock Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

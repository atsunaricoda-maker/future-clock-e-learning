'use client';

export const runtime = 'edge';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const response = await api.forgotPassword(email);
    
    setIsLoading(false);
    
    if (response.success) {
      setIsSubmitted(true);
    } else {
      setError(response.error?.message || 'エラーが発生しました');
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">メールを送信しました</h1>
            <p className="text-gray-600 mb-6">
              <span className="font-medium">{email}</span> 宛にパスワードリセット用のメールを送信しました。
              メールに記載されたリンクからパスワードをリセットしてください。
            </p>
            <p className="text-sm text-gray-500 mb-8">
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </p>
            <Link href="/sign-in">
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold">パスワードをお忘れですか？</h1>
            <p className="text-gray-600 mt-2">
              ご登録のメールアドレスを入力してください。<br />
              パスワードリセット用のリンクをお送りします。
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
                メールアドレス
              </label>
              <Input
                type="email"
                required
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  送信中...
                </>
              ) : (
                'リセットリンクを送信'
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

        <p className="text-center text-sm text-gray-500 mt-6">
          アカウントをお持ちでない方は{' '}
          <Link href="/sign-up" className="text-blue-600 hover:underline">
            新規登録
          </Link>
        </p>

        <footer className="text-center text-sm text-gray-400 mt-8">
          © 2026 FutureClock Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

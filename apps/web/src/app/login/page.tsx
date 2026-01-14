'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  useEffect(() => {
    // クエリパラメータを保持してリダイレクト
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      window.location.href = `/sign-in?redirect=${encodeURIComponent(redirect)}`;
    } else {
      window.location.href = '/sign-in';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

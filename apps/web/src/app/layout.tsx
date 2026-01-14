import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | e-Learning Platform',
    default: 'e-Learning Platform - 学びの未来を、ここから',
  },
  description:
    'リスキリング助成金対応のe-Learningプラットフォーム。質の高い学びを、すべての人に。',
  keywords: ['eラーニング', 'リスキリング', '助成金', 'オンライン学習', '動画講座'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

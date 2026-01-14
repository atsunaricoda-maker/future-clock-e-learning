import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">e-Learning</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

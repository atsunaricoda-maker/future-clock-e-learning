import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Star, Users, BookOpen, ArrowRight } from 'lucide-react';

export default function InstructorsPage() {
  const instructors = [
    {
      id: 'user-instructor-1',
      name: '山田太郎',
      headline: 'AI・機械学習エンジニア',
      bio: '大手IT企業で10年以上の経験を持つAIエンジニア。初心者にも分かりやすい解説が好評。',
      rating: 4.8,
      students: 4510,
      courses: 3,
      avatarUrl: null,
    },
    {
      id: 'instructor-2',
      name: '鈴木花子',
      headline: 'Webデザイナー / UXコンサルタント',
      bio: 'フリーランスとして100社以上のWebデザインを手がける。実践的なデザインスキルを伝授。',
      rating: 4.7,
      students: 3200,
      courses: 5,
      avatarUrl: null,
    },
    {
      id: 'instructor-3',
      name: 'John Smith',
      headline: 'ビジネス英語講師',
      bio: 'ネイティブスピーカーによる実践的なビジネス英語レッスン。TOEIC満点取得。',
      rating: 4.9,
      students: 5800,
      courses: 4,
      avatarUrl: null,
    },
    {
      id: 'instructor-4',
      name: '佐藤健一',
      headline: 'データサイエンティスト',
      bio: '統計学の専門家。データ分析の基礎から応用まで、体系的に学べるカリキュラムを提供。',
      rating: 4.6,
      students: 2100,
      courses: 2,
      avatarUrl: null,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-16">
          <div className="container">
            <h1 className="text-4xl font-bold text-center">講師一覧</h1>
            <p className="text-xl text-muted-foreground text-center mt-4">
              各分野のエキスパートから直接学べます
            </p>
          </div>
        </section>

        {/* Instructors Grid */}
        <section className="py-16">
          <div className="container">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instructors.map((instructor) => (
                <Link 
                  key={instructor.id} 
                  href={`/instructors/${instructor.id}`}
                  className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {instructor.avatarUrl ? (
                        <img
                          src={instructor.avatarUrl}
                          alt={instructor.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">
                          {instructor.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{instructor.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {instructor.headline}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                    {instructor.bio}
                  </p>

                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      {instructor.rating}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {instructor.students.toLocaleString()}人
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      {instructor.courses}コース
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Become Instructor CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold">講師として活躍しませんか？</h2>
              <p className="text-muted-foreground mt-4">
                あなたの知識と経験を活かして、世界中の学習者に教えましょう。<br />
                柔軟な働き方で収入を得られます。
              </p>
              <Link href="/instructor/register">
                <Button size="lg" className="mt-6 gap-2">
                  講師登録について
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 FutureClock Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

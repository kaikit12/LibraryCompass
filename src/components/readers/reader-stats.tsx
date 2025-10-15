'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Award, TrendingUp, Calendar, Target } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { differenceInDays, format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ReadingStats {
  totalBooksRead: number;
  currentlyBorrowed: number;
  favoriteGenres: { genre: string; count: number }[];
  readingStreak: number; // Days
  averageBooksPerMonth: number;
  badges: string[];
}

export function ReaderStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all borrowals (current + history)
      const borrowalsQuery = query(
        collection(db, 'borrowals'),
        where('userId', '==', user.id)
      );
      const borrowalsSnapshot = await getDocs(borrowalsQuery);
      const borrowals = borrowalsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          bookId: data.bookId,
          userId: data.userId,
          status: data.status,
          borrowedAt: data.borrowedAt?.toDate(),
          returnedAt: data.returnedAt?.toDate(),
        };
      });

      // Total books read (returned books)
      const returnedBooks = borrowals.filter((b) => b.returnedAt);
      const totalBooksRead = returnedBooks.length;

      // Currently borrowed
      const currentlyBorrowed = borrowals.filter((b) => !b.returnedAt && b.status === 'borrowed').length;

      // Get book details for genre analysis
      const bookIds = borrowals.map((b) => b.bookId);
      const uniqueBookIds = [...new Set(bookIds)];
      
      const genreCounts: { [key: string]: number } = {};
      for (const bookId of uniqueBookIds) {
        const bookSnapshot = await getDocs(query(collection(db, 'books'), where('__name__', '==', bookId)));
        if (!bookSnapshot.empty) {
          const genre = bookSnapshot.docs[0].data().genre;
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      }

      const favoriteGenres = Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Reading streak (simplified - consecutive days with borrowals)
      let readingStreak = 0;
      if (borrowals.length > 0) {
        const sortedBorrowals = borrowals
          .filter((b) => b.borrowedAt)
          .sort((a, b) => b.borrowedAt.getTime() - a.borrowedAt.getTime());
        
        if (sortedBorrowals.length > 0) {
          const lastBorrowDate = sortedBorrowals[0].borrowedAt;
          const daysSinceLastBorrow = differenceInDays(new Date(), lastBorrowDate);
          
          if (daysSinceLastBorrow <= 7) {
            readingStreak = daysSinceLastBorrow;
          }
        }
      }

      // Average books per month
      const firstBorrow = borrowals.length > 0 
        ? borrowals.sort((a, b) => a.borrowedAt?.getTime() - b.borrowedAt?.getTime())[0].borrowedAt
        : new Date();
      const monthsSinceFirst = Math.max(1, differenceInDays(new Date(), firstBorrow) / 30);
      const averageBooksPerMonth = totalBooksRead / monthsSinceFirst;

      // Badges based on achievements
      const badges: string[] = [];
      if (totalBooksRead >= 1) badges.push('📚 Người đọc mới');
      if (totalBooksRead >= 5) badges.push('📖 Mọt sách');
      if (totalBooksRead >= 10) badges.push('🎓 Học giả');
      if (totalBooksRead >= 20) badges.push('🏆 Chuyên gia');
      if (totalBooksRead >= 50) badges.push('👑 Bậc thầy');
      if (readingStreak >= 7) badges.push('🔥 Streak 7 ngày');
      if (currentlyBorrowed >= 3) badges.push('📚 Đa nhiệm');

      setStats({
        totalBooksRead,
        currentlyBorrowed,
        favoriteGenres,
        readingStreak,
        averageBooksPerMonth,
        badges,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Thống kê đọc sách
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng sách đã đọc</p>
                <p className="text-3xl font-bold text-primary">{stats.totalBooksRead}</p>
              </div>
              <BookOpen className="h-12 w-12 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Đang mượn</p>
                <p className="text-3xl font-bold text-blue-600">{stats.currentlyBorrowed}</p>
              </div>
              <Calendar className="h-12 w-12 text-blue-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reading Streak</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats.readingStreak} <span className="text-lg">ngày</span>
                </p>
              </div>
              <Target className="h-12 w-12 text-orange-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">TB/tháng</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.averageBooksPerMonth.toFixed(1)}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Favorite Genres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Thể loại yêu thích
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.favoriteGenres.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Chưa có dữ liệu thể loại
            </p>
          ) : (
            <div className="space-y-3">
              {stats.favoriteGenres.map((item, index) => (
                <div key={item.genre} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      #{index + 1}
                    </Badge>
                    <span className="font-medium">{item.genre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(item.count / stats.favoriteGenres[0].count) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badges & Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Huy hiệu & Thành tựu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.badges.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Mượn sách để nhận huy hiệu đầu tiên!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.badges.map((badge) => (
                <Badge
                  key={badge}
                  variant="secondary"
                  className="text-base py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold border-amber-400 shadow-md"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

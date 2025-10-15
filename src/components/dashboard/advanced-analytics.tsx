'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Users, BookOpen, Clock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, format, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MonthlyData {
  month: string;
  borrowed: number;
  returned: number;
}

interface PeakHourData {
  hour: string;
  count: number;
}

interface DemographicData {
  role: string;
  count: number;
  percentage: number;
}

interface PopularBook {
  title: string;
  author: string;
  borrowCount: number;
  rating: number;
}

export function MonthlyTrendsChart() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthlyData();
  }, []);

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      const borrowalsSnapshot = await getDocs(collection(db, 'borrowals'));
      const borrowals = borrowalsSnapshot.docs.map((doc) => ({
        borrowedAt: doc.data().borrowedAt?.toDate(),
        returnedAt: doc.data().returnedAt?.toDate(),
      }));

      // Get last 6 months data
      const monthlyData: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const targetDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(targetDate);
        const monthEnd = endOfMonth(targetDate);

        const borrowed = borrowals.filter(
          (b) => b.borrowedAt && b.borrowedAt >= monthStart && b.borrowedAt <= monthEnd
        ).length;

        const returned = borrowals.filter(
          (b) => b.returnedAt && b.returnedAt >= monthStart && b.returnedAt <= monthEnd
        ).length;

        monthlyData.push({
          month: format(targetDate, 'MMM yyyy', { locale: vi }),
          borrowed,
          returned,
        });
      }

      setData(monthlyData);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng mượn/trả theo tháng</CardTitle>
          <CardDescription>6 tháng gần nhất</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Xu hướng mượn/trả theo tháng
        </CardTitle>
        <CardDescription>6 tháng gần nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="borrowed"
              stroke="#8b5cf6"
              name="Mượn"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="returned"
              stroke="#10b981"
              name="Trả"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PeakHoursChart() {
  const [data, setData] = useState<PeakHourData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPeakHours();
  }, []);

  const loadPeakHours = async () => {
    setLoading(true);
    try {
      const borrowalsSnapshot = await getDocs(collection(db, 'borrowals'));
      const borrowals = borrowalsSnapshot.docs.map((doc) => ({
        borrowedAt: doc.data().borrowedAt?.toDate(),
      }));

      // Count by hour
      const hourCounts: { [key: number]: number } = {};
      borrowals.forEach((b) => {
        if (b.borrowedAt) {
          const hour = b.borrowedAt.getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });

      // Convert to array for chart
      const hourData: PeakHourData[] = [];
      for (let hour = 0; hour < 24; hour++) {
        hourData.push({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          count: hourCounts[hour] || 0,
        });
      }

      setData(hourData);
    } catch (error) {
      console.error('Error loading peak hours:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Giờ cao điểm</CardTitle>
          <CardDescription>Thời gian mượn sách phổ biến</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Giờ cao điểm
        </CardTitle>
        <CardDescription>Thời gian mượn sách phổ biến nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#f59e0b" name="Số lượt mượn" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ReaderDemographics() {
  const [data, setData] = useState<DemographicData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemographics();
  }, []);

  const loadDemographics = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map((doc) => ({
        role: doc.data().role,
      }));

      const total = users.length;
      const roleCounts: { [key: string]: number } = {};
      
      users.forEach((u) => {
        roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
      });

      const demographics: DemographicData[] = Object.entries(roleCounts).map(
        ([role, count]) => ({
          role: role === 'admin' ? 'Quản trị viên' : role === 'librarian' ? 'Thủ thư' : 'Người đọc',
          count,
          percentage: (count / total) * 100,
        })
      );

      setData(demographics);
    } catch (error) {
      console.error('Error loading demographics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phân loại người dùng</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Phân loại người dùng
        </CardTitle>
        <CardDescription>Theo vai trò</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.role}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.role}</span>
                <span className="text-sm text-muted-foreground">
                  {item.count} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PopularBooksRanking() {
  const [books, setBooks] = useState<PopularBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPopularBooks();
  }, []);

  const loadPopularBooks = async () => {
    setLoading(true);
    try {
      const booksSnapshot = await getDocs(collection(db, 'books'));
      const booksData = booksSnapshot.docs
        .map((doc) => ({
          title: doc.data().title,
          author: doc.data().author,
          borrowCount: doc.data().totalBorrows || 0,
          rating: doc.data().rating || 0,
        }))
        .filter((b) => b.borrowCount > 0)
        .sort((a, b) => b.borrowCount - a.borrowCount)
        .slice(0, 10);

      setBooks(booksData);
    } catch (error) {
      console.error('Error loading popular books:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top sách phổ biến</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Top 10 sách phổ biến
        </CardTitle>
        <CardDescription>Theo số lượt mượn</CardDescription>
      </CardHeader>
      <CardContent>
        {books.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-3">
            {books.map((book, index) => (
              <div
                key={book.title}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-1">{book.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {book.author}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="font-semibold text-primary">{book.borrowCount} lượt</p>
                  {book.rating > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ⭐ {book.rating.toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InventoryTurnover() {
  const [turnoverRate, setTurnoverRate] = useState<number>(0);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [totalBorrows, setTotalBorrows] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTurnoverData();
  }, []);

  const loadTurnoverData = async () => {
    setLoading(true);
    try {
      const booksSnapshot = await getDocs(collection(db, 'books'));
      const books = booksSnapshot.docs.map((doc) => ({
        quantity: doc.data().quantity || 0,
        totalBorrows: doc.data().totalBorrows || 0,
      }));

      const total = books.reduce((sum, b) => sum + b.quantity, 0);
      const borrows = books.reduce((sum, b) => sum + b.totalBorrows, 0);
      
      // Turnover rate = Total Borrows / Total Books
      const rate = total > 0 ? (borrows / total) : 0;

      setTotalBooks(total);
      setTotalBorrows(borrows);
      setTurnoverRate(rate);
    } catch (error) {
      console.error('Error loading turnover data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tỷ lệ luân chuyển kho</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tỷ lệ luân chuyển kho
        </CardTitle>
        <CardDescription>Hiệu suất sử dụng tài nguyên</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-primary">
              {turnoverRate.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Lượt mượn trung bình/sách
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-semibold">{totalBooks}</p>
              <p className="text-sm text-muted-foreground">Tổng số sách</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-green-600">{totalBorrows}</p>
              <p className="text-sm text-muted-foreground">Tổng lượt mượn</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/layout/page-header';
import StatsCards from '@/components/dashboard/stats-cards';
import OverdueBooks from '@/components/dashboard/overdue-books';
import CurrentlyBorrowedBooks from '@/components/dashboard/currently-borrowed-books';
import { GenreDistributionChart } from '@/components/dashboard/genre-distribution-chart';
import { BorrowingTrendsChart } from '@/components/dashboard/borrowing-trends-chart';
import { RenewalRequestsManager } from '@/components/books/renewal-requests-manager';
import { AppointmentsManager } from '@/components/books/appointments-manager';
import { 
  MonthlyTrendsChart, 
  PeakHoursChart, 
  ReaderDemographics, 
  PopularBooksRanking, 
  InventoryTurnover 
} from '@/components/dashboard/advanced-analytics';
import { ExportDataDialog } from '@/components/dashboard/export-data-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Loader2 } from 'lucide-react';


export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role === 'reader') {
      router.push('/my-books');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role === 'reader') {
    return null; // sẽ redirect trong useEffect
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Bảng điều khiển" 
          description="Tổng quan hoạt động thư viện của bạn."
        />
        <ExportDataDialog />
      </div>

      <StatsCards />

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
    <Card className="lg:col-span-4">
      <CardHeader>
        <CardTitle>Xu hướng mượn sách</CardTitle>
        <CardDescription>Số lượt mượn/trả trong 7 ngày gần nhất.</CardDescription>
      </CardHeader>
      <CardContent>
        <BorrowingTrendsChart />
      </CardContent>
    </Card>
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Thể loại phổ biến</CardTitle>
        <CardDescription>Phân bố sách đang được mượn theo thể loại.</CardDescription>
      </CardHeader>
      <CardContent>
        <GenreDistributionChart />
      </CardContent>
    </Card>
      </div>

  {/* Advanced Analytics Section */}
  <div className="space-y-8">
    <h2 className="text-2xl font-bold">Phân tích nâng cao</h2>
    
    {/* Monthly Trends - Full Width */}
    <MonthlyTrendsChart />

    {/* Peak Hours & Demographics */}
    <div className="grid gap-8 md:grid-cols-2">
      <PeakHoursChart />
      <ReaderDemographics />
    </div>

    {/* Popular Books & Inventory Turnover */}
    <div className="grid gap-8 md:grid-cols-2">
      <PopularBooksRanking />
      <InventoryTurnover />
    </div>
  </div>

  <RenewalRequestsManager />

  <AppointmentsManager />

  <OverdueBooks />

  <CurrentlyBorrowedBooks />
    </div>
  );
}

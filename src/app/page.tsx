import StatsCards from '@/components/dashboard/stats-cards';
import OverdueBooks from '@/components/dashboard/overdue-books';
import CurrentlyBorrowedBooks from '@/components/dashboard/currently-borrowed-books';
import { GenreDistributionChart } from '@/components/dashboard/genre-distribution-chart';
import { BorrowingTrendsChart } from '@/components/dashboard/borrowing-trends-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function DashboardPage() {
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          An overview of your library's activities.
        </p>
      </header>

      <StatsCards />

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Borrowing Trends</CardTitle>
                <CardDescription>Books borrowed and returned in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <BorrowingTrendsChart />
            </CardContent>
        </Card>
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Popular Genres</CardTitle>
                <CardDescription>Distribution of currently borrowed books by genre.</CardDescription>
            </CardHeader>
            <CardContent>
                <GenreDistributionChart />
            </CardContent>
        </Card>
      </div>

      <OverdueBooks />

      <CurrentlyBorrowedBooks />
    </div>
  );
}

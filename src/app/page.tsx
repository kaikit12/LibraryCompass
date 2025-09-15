import StatsCards from '@/components/dashboard/stats-cards';
import OverdueBooks from '@/components/dashboard/overdue-books';
import CurrentlyBorrowedBooks from '@/components/dashboard/currently-borrowed-books';
import { GenreDistributionChart } from '@/components/dashboard/genre-distribution-chart';
import { BorrowingTrendsChart } from '@/components/dashboard/borrowing-trends-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';


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

      <Card>
        <CardHeader>
          <CardTitle>Example Dialog</CardTitle>
          <CardDescription>An example of an accessible dialog with a visually hidden title.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <button className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md">Open</button>
            </DialogTrigger>
            <DialogContent>
              <VisuallyHidden>
                <DialogTitle>Dialog Title</DialogTitle>
              </VisuallyHidden>
              <p>This is the content of the dialog.</p>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

import StatsCards from '@/components/dashboard/stats-cards';
import OverdueBooks from '@/components/dashboard/overdue-books';
import { db } from '@/lib/firebase';
import type { Book, Reader } from '@/lib/types';
import { collection, getDocs } from 'firebase/firestore';

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

      <OverdueBooks />
    </div>
  );
}

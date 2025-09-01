import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, Users, Library } from 'lucide-react';

interface StatsCardsProps {
  books: Book[];
  readers: Reader[];
}

export default function StatsCards({ books, readers }: StatsCardsProps) {
  const totalBooks = books.length;
  const totalReaders = readers.length;
  const borrowedBooks = books.filter(book => book.status === 'Borrowed').length;

  const stats = [
    { title: 'Total Books', value: totalBooks, icon: Library },
    { title: 'Books Borrowed', value: borrowedBooks, icon: BookCopy },
    { title: 'Total Readers', value: totalReaders, icon: Users },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

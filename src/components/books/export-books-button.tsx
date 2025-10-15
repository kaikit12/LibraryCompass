'use client';

import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Book } from '@/lib/types';
import { exportInventoryToCSV, exportInventoryToPDF } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';

export function ExportBooksButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'csv' | 'pdf') => {
    setLoading(true);

    try {
      const booksSnapshot = await getDocs(collection(db, 'books'));
      const books = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[];

      if (format === 'csv') {
        exportInventoryToCSV(books);
      } else {
        exportInventoryToPDF(books);
      }

      toast({
        title: 'Xuất dữ liệu thành công',
        description: `Đã xuất ${books.length} sách ra file ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Lỗi xuất dữ liệu',
        description: 'Không thể xuất dữ liệu. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang xuất...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Xuất danh mục
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Xuất CSV (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileDown className="mr-2 h-4 w-4" />
          Xuất PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

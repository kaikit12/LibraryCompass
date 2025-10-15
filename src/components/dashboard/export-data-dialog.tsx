'use client';

import { useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Book, Borrowal, User } from '@/lib/types';
import {
  exportBorrowingHistoryToCSV,
  exportBorrowingHistoryToPDF,
  exportInventoryToCSV,
  exportInventoryToPDF,
  exportOverdueBooksToCSV,
  exportOverdueBooksToPDF,
  exportUsersToCSV,
  backupFirestoreToJSON,
} from '@/lib/export-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Download, FileDown, FileSpreadsheet, Database, Loader2 } from 'lucide-react';

type ExportType = 'borrowing-history' | 'inventory' | 'overdue' | 'users';
type ExportFormat = 'csv' | 'pdf';

export function ExportDataDialog() {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('borrowing-history');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);

    try {
      if (exportType === 'borrowing-history') {
        // Fetch borrowals
        const borrowalsQuery = query(
          collection(db, 'borrowals'),
          orderBy('borrowedAt', 'desc')
        );
        const borrowalsSnapshot = await getDocs(borrowalsQuery);
        const borrowals = borrowalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Borrowal[];

        // Fetch books
        const booksSnapshot = await getDocs(collection(db, 'books'));
        const books = booksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Book[];

        if (exportFormat === 'csv') {
          exportBorrowingHistoryToCSV(borrowals, books);
        } else {
          exportBorrowingHistoryToPDF(borrowals, books);
        }

        toast({
          title: 'Xuất dữ liệu thành công',
          description: `Đã xuất lịch sử mượn sách ra file ${exportFormat.toUpperCase()}.`,
        });
      } else if (exportType === 'inventory') {
        const booksSnapshot = await getDocs(collection(db, 'books'));
        const books = booksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Book[];

        if (exportFormat === 'csv') {
          exportInventoryToCSV(books);
        } else {
          exportInventoryToPDF(books);
        }

        toast({
          title: 'Xuất dữ liệu thành công',
          description: `Đã xuất tồn kho sách ra file ${exportFormat.toUpperCase()}.`,
        });
      } else if (exportType === 'overdue') {
        const borrowalsQuery = query(
          collection(db, 'borrowals'),
          orderBy('dueDate', 'asc')
        );
        const borrowalsSnapshot = await getDocs(borrowalsQuery);
        const borrowals = borrowalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Borrowal[];

        const booksSnapshot = await getDocs(collection(db, 'books'));
        const books = booksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Book[];

        if (exportFormat === 'csv') {
          exportOverdueBooksToCSV(borrowals, books);
        } else {
          exportOverdueBooksToPDF(borrowals, books);
        }

        toast({
          title: 'Xuất dữ liệu thành công',
          description: `Đã xuất báo cáo sách quá hạn ra file ${exportFormat.toUpperCase()}.`,
        });
      } else if (exportType === 'users') {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];

        exportUsersToCSV(users);

        toast({
          title: 'Xuất dữ liệu thành công',
          description: 'Đã xuất danh sách người dùng ra file CSV.',
        });
      }

      setOpen(false);
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

  const handleBackup = async () => {
    setLoading(true);

    try {
      // Backup books
      const booksSnapshot = await getDocs(collection(db, 'books'));
      const booksData = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      backupFirestoreToJSON(booksData, 'books');

      // Backup borrowals
      const borrowalsSnapshot = await getDocs(collection(db, 'borrowals'));
      const borrowalsData = borrowalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      backupFirestoreToJSON(borrowalsData, 'borrowals');

      // Backup users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      backupFirestoreToJSON(usersData, 'users');

      toast({
        title: 'Sao lưu thành công',
        description: 'Đã sao lưu toàn bộ dữ liệu Firestore ra 3 file JSON.',
      });

      setOpen(false);
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: 'Lỗi sao lưu',
        description: 'Không thể sao lưu dữ liệu. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Xuất dữ liệu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu & Sao lưu</DialogTitle>
          <DialogDescription>
            Chọn loại dữ liệu và định dạng file bạn muốn xuất.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type */}
          <div className="space-y-3">
            <Label>Loại dữ liệu</Label>
            <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as ExportType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="borrowing-history" id="borrowing-history" />
                <Label htmlFor="borrowing-history" className="font-normal cursor-pointer">
                  📚 Lịch sử mượn sách (tất cả giao dịch)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inventory" id="inventory" />
                <Label htmlFor="inventory" className="font-normal cursor-pointer">
                  📖 Tồn kho sách (danh mục sách)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="overdue" id="overdue" />
                <Label htmlFor="overdue" className="font-normal cursor-pointer">
                  ⚠️ Báo cáo sách quá hạn
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="users" id="users" />
                <Label htmlFor="users" className="font-normal cursor-pointer">
                  👥 Danh sách người dùng (chỉ CSV)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Export Format */}
          {exportType !== 'users' && (
            <div className="space-y-3">
              <Label>Định dạng file</Label>
              <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="font-normal cursor-pointer">
                    <FileSpreadsheet className="inline mr-2 h-4 w-4" />
                    CSV (Excel)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="font-normal cursor-pointer">
                    <FileDown className="inline mr-2 h-4 w-4" />
                    PDF (Báo cáo)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Xuất dữ liệu
                </>
              )}
            </Button>

            <Button
              onClick={handleBackup}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang sao lưu...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Sao lưu toàn bộ
                </>
              )}
            </Button>
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">💡 Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>• <strong>CSV:</strong> Mở bằng Excel, Google Sheets (UTF-8 với BOM)</p>
              <p>• <strong>PDF:</strong> Báo cáo in ấn với bảng định dạng</p>
              <p>• <strong>Sao lưu toàn bộ:</strong> Xuất 3 file JSON (books, borrowals, users)</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}


"use client";
import { useState, useEffect } from 'react';
import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/layout/page-header';
import { Download, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface RevenueEntry {
  transactionId: string;
  bookTitle: string;
  userName: string;
  date: string;
  amount: number;
  createdAt: Date;
}

interface MonthlyRevenue {
  month: string;
  amount: number;
}

export default function RevenueReportPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Export dialog states
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [exportFormat, setExportFormat] = useState<string>("excel");

  useEffect(() => {
    const transactionsQuery = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const booksQuery = collection(db, "books");
    const readersQuery = collection(db, "users");

    const unsubTransactions = onSnapshot(transactionsQuery, (transactionsSnapshot) => {
        const unsubBooks = onSnapshot(booksQuery, (booksSnapshot) => {
            const unsubReaders = onSnapshot(readersQuery, (readersSnapshot) => {
                setLoading(true);
                const booksMap = new Map(booksSnapshot.docs.map(doc => [doc.id, doc.data() as Book]));
                const readersMap = new Map(readersSnapshot.docs.map(doc => [doc.id, doc.data() as Reader]));
                
                const newRevenueEntries: RevenueEntry[] = [];
                let currentTotalRevenue = 0;

                transactionsSnapshot.forEach(doc => {
                    const transactionData = doc.data();
                    
                    if (transactionData.type === 'late_fee') {
                        const user = readersMap.get(transactionData.userId);
                        const book = booksMap.get(transactionData.bookId);
                        const createdAt = transactionData.createdAt.toDate();
                        
                        newRevenueEntries.push({
                            transactionId: doc.id,
                            bookTitle: book?.title || 'Sách không xác định',
                            userName: user?.name || 'Người dùng không xác định',
                            date: format(createdAt, 'PPP', { locale: vi }),
                            amount: transactionData.amount,
                            createdAt: createdAt,
                        });
                        
                        currentTotalRevenue += transactionData.amount;
                    }
                });

                // Calculate monthly revenue
                const monthlyRevenueMap = new Map<string, number>();
                newRevenueEntries.forEach(entry => {
                    const monthKey = format(entry.createdAt, 'yyyy-MM', { locale: vi });
                    const monthLabel = format(entry.createdAt, 'MMMM yyyy', { locale: vi });
                    const currentAmount = monthlyRevenueMap.get(monthKey) || 0;
                    monthlyRevenueMap.set(monthKey, currentAmount + entry.amount);
                });

                const monthlyRevenueArray: MonthlyRevenue[] = Array.from(monthlyRevenueMap.entries())
                    .map(([key, amount]) => {
                        const [year, month] = key.split('-');
                        const date = new Date(parseInt(year), parseInt(month) - 1);
                        return {
                            month: format(date, 'MMMM yyyy', { locale: vi }),
                            amount
                        };
                    })
                    .sort((a, b) => {
                        const dateA = new Date(a.month);
                        const dateB = new Date(b.month);
                        return dateB.getTime() - dateA.getTime();
                    });

                setRevenueEntries(newRevenueEntries);
                setMonthlyRevenue(monthlyRevenueArray);
                setTotalRevenue(currentTotalRevenue);
                setLoading(false);
            });
            return () => unsubReaders();
        });
        return () => unsubBooks();
    });

    return () => unsubTransactions();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  }

  const handleExport = () => {
    if (!startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc.'
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc.'
      });
      return;
    }

    // Check if end date is not in the future
    const now = new Date();
    now.setHours(23, 59, 59, 999); // Set to end of today
    
    if (endDate > now) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: 'Ngày kết thúc không được vượt quá ngày hiện tại.'
      });
      return;
    }

    // Filter entries by date range (inclusive of end date)
    // Set start date to beginning of day and end date to end of day
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setHours(0, 0, 0, 0);
    
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);
    
    const filteredEntries = revenueEntries.filter(entry => {
      return isWithinInterval(entry.createdAt, { start: adjustedStartDate, end: adjustedEndDate });
    });

    if (filteredEntries.length === 0) {
      toast({
        variant: 'destructive',
        title: '❌ Không có dữ liệu',
        description: 'Không có giao dịch nào trong khoảng thời gian đã chọn.'
      });
      return;
    }

    const totalExport = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);

    switch (exportFormat) {
      case 'excel':
        exportToExcel(filteredEntries, totalExport);
        break;
      case 'csv':
        exportToCSV(filteredEntries, totalExport);
        break;
      case 'txt':
        exportToTXT(filteredEntries, totalExport);
        break;
      case 'json':
        exportToJSON(filteredEntries, totalExport);
        break;
      default:
        toast({
          variant: 'destructive',
          title: '❌ Lỗi',
          description: 'Định dạng file không được hỗ trợ.'
        });
    }
  };

  const exportToExcel = (entries: RevenueEntry[], total: number) => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare data for Excel
    const excelData = [
      ['BÁO CÁO DOANH THU TIỀN PHẠT'],
      [`Từ ngày: ${format(startDate!, 'dd/MM/yyyy', { locale: vi })} - Đến ngày: ${format(endDate!, 'dd/MM/yyyy', { locale: vi })}`],
      [], // Empty row
      ['Tiêu đề sách', 'Bạn đọc', 'Ngày', 'Số tiền'],
      ...entries.map(entry => [
        entry.bookTitle,
        entry.userName,
        entry.date,
        formatCurrency(entry.amount)
      ]),
      [], // Empty row
      ['', '', 'TỔNG CỘNG:', formatCurrency(total)]
    ];

    // Create worksheet from data
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 40 }, // Tiêu đề sách
      { wch: 25 }, // Bạn đọc
      { wch: 20 }, // Ngày
      { wch: 15 }  // Số tiền
    ];

    // Merge cells for title
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Merge title row
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }  // Merge date range row
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo doanh thu');

    // Generate file and download
    XLSX.writeFile(wb, `bao-cao-doanh-thu-${format(startDate!, 'dd-MM-yyyy')}-${format(endDate!, 'dd-MM-yyyy')}.xlsx`);

    toast({
      title: '✅ Xuất file thành công',
      description: `Đã xuất ${entries.length} giao dịch sang Excel (.xlsx).`
    });
    setIsExportOpen(false);
  };

  const exportToCSV = (entries: RevenueEntry[], total: number) => {
    let csvContent = '\uFEFF';
    csvContent += 'Tiêu đề sách,Bạn đọc,Ngày,Số tiền\n';
    
    entries.forEach(entry => {
      csvContent += `"${entry.bookTitle}","${entry.userName}","${entry.date}",${entry.amount}\n`;
    });
    
    csvContent += `\nTổng cộng,,,${total}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-doanh-thu-${format(startDate!, 'dd-MM-yyyy')}-${format(endDate!, 'dd-MM-yyyy')}.csv`;
    link.click();

    toast({
      title: '✅ Xuất file thành công',
      description: `Đã xuất ${entries.length} giao dịch sang CSV.`
    });
    setIsExportOpen(false);
  };

  const exportToTXT = (entries: RevenueEntry[], total: number) => {
    let txtContent = '========================================\n';
    txtContent += '       BÁO CÁO DOANH THU TIỀN PHẠT       \n';
    txtContent += '========================================\n\n';
    txtContent += `Từ ngày: ${format(startDate!, 'dd/MM/yyyy', { locale: vi })}\n`;
    txtContent += `Đến ngày: ${format(endDate!, 'dd/MM/yyyy', { locale: vi })}\n\n`;
    txtContent += '----------------------------------------\n';
    txtContent += 'DANH SÁCH GIAO DỊCH:\n';
    txtContent += '----------------------------------------\n\n';

    entries.forEach((entry, index) => {
      txtContent += `${index + 1}. ${entry.bookTitle}\n`;
      txtContent += `   Bạn đọc: ${entry.userName}\n`;
      txtContent += `   Ngày: ${entry.date}\n`;
      txtContent += `   Số tiền: ${formatCurrency(entry.amount)}\n\n`;
    });

    txtContent += '========================================\n';
    txtContent += `TỔNG CỘNG: ${formatCurrency(total)}\n`;
    txtContent += `Số giao dịch: ${entries.length}\n`;
    txtContent += '========================================\n';

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-doanh-thu-${format(startDate!, 'dd-MM-yyyy')}-${format(endDate!, 'dd-MM-yyyy')}.txt`;
    link.click();

    toast({
      title: '✅ Xuất file thành công',
      description: `Đã xuất ${entries.length} giao dịch sang TXT.`
    });
    setIsExportOpen(false);
  };

  const exportToJSON = (entries: RevenueEntry[], total: number) => {
    const jsonData = {
      report: 'Báo cáo doanh thu tiền phạt',
      startDate: format(startDate!, 'dd/MM/yyyy', { locale: vi }),
      endDate: format(endDate!, 'dd/MM/yyyy', { locale: vi }),
      totalRevenue: total,
      totalTransactions: entries.length,
      transactions: entries.map(entry => ({
        bookTitle: entry.bookTitle,
        userName: entry.userName,
        date: entry.date,
        amount: entry.amount
      }))
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-doanh-thu-${format(startDate!, 'dd-MM-yyyy')}-${format(endDate!, 'dd-MM-yyyy')}.json`;
    link.click();

    toast({
      title: '✅ Xuất file thành công',
      description: `Đã xuất ${entries.length} giao dịch sang JSON.`
    });
    setIsExportOpen(false);
  };

  // Only admin can access this page
  if (currentUser?.role !== 'admin') {
      return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Truy cập bị từ chối</h1>
            <p className="text-muted-foreground">Chỉ admin mới có quyền xem báo cáo doanh thu.</p>
        </div>
      );
  }

  return (
    <div className="space-y-8">
       <PageHeader 
            title="Báo cáo doanh thu" 
            description="Lịch sử chi tiết tất cả các giao dịch tiền phạt trễ hạn."
        />

        <Card>
            <CardHeader>
                <CardTitle>Tổng doanh thu phí trễ hạn</CardTitle>
                <CardDescription>Tổng số tiền phạt trễ hạn đã thu được từ tất cả thời gian.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{formatCurrency(totalRevenue)}</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Thống kê theo tháng</CardTitle>
                <CardDescription>Doanh thu phí trễ hạn phân chia theo từng tháng.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center text-muted-foreground p-8">Đang tải...</div>
                ) : monthlyRevenue.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tháng</TableHead>
                                    <TableHead className="text-right">Doanh thu</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monthlyRevenue.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.month}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(item.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground p-8">
                        Chưa có dữ liệu theo tháng.
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline">Lịch sử giao dịch</CardTitle>
                <CardDescription>Danh sách tất cả các khoản phí trễ hạn.</CardDescription>
            </div>
            <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Xuất file
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Xuất báo cáo doanh thu</DialogTitle>
                        <DialogDescription>
                            Chọn khoảng thời gian và định dạng file để xuất báo cáo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Ngày bắt đầu</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "justify-start text-left font-normal",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, 'PPP', { locale: vi }) : "Chọn ngày bắt đầu"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        locale={vi}
                                        disabled={(date) => date > new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label>Ngày kết thúc</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "justify-start text-left font-normal",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, 'PPP', { locale: vi }) : "Chọn ngày kết thúc"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={setEndDate}
                                        locale={vi}
                                        disabled={(date) => date > new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
```                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="format">Định dạng file</Label>
                            <Select value={exportFormat} onValueChange={setExportFormat}>
                                <SelectTrigger id="format">
                                    <SelectValue placeholder="Chọn định dạng" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                                    <SelectItem value="txt">Text (.txt)</SelectItem>
                                    <SelectItem value="json">JSON (.json)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExportOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleExport} className="gap-2">
                            <Download className="h-4 w-4" />
                            Xuất file
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            {loading ? (
            <div className="text-center text-muted-foreground p-8">Đang tải...</div>
            ) : revenueEntries.length > 0 ? (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Tiêu đề sách</TableHead>
                    <TableHead>Bạn đọc</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {revenueEntries.map((entry) => (
                    <TableRow key={entry.transactionId}>
                        <TableCell className="font-medium">{entry.bookTitle}</TableCell>
                        <TableCell>{entry.userName}</TableCell>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
            ) : (
            <div className="text-center text-muted-foreground p-8">
                Chưa có giao dịch phí trễ hạn nào được ghi nhận.
            </div>
            )}
        </CardContent>
        </Card>
    </div>
  );
}

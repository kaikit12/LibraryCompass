'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  FileSpreadsheet, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  Calendar,
  Download,
  Filter,
  Upload,
  RefreshCw
} from 'lucide-react';
import { Book } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { safeOnSnapshot } from '@/lib/firebase';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';

interface InventoryData {
  totalBooks: number;
  goodCondition: number;
  fairCondition?: number;
  damagedCondition: number;
  lostCondition: number;
  lowStock: number;
  criticalStock: number;
  totalValue: number;
}

interface MonthlyDamageData {
  month: string;
  damaged: number;
  lost: number;
  total: number;
}

interface GenreInventoryData {
  genre: string;
  good: number;
  damaged: number;
  lost: number;
  total: number;
  value: number;
}

export function InventoryReports() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6'); // months
  const [selectedGenre, setSelectedGenre] = useState('all');

  // Manual refresh function
  const refreshData = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'books'));
      const booksList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      
      console.log('🔄 Manual refresh - Books loaded:', booksList.length, booksList);
      setBooks(booksList);
    } catch (error) {
      console.error('Manual refresh error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadBooks = () => {
      // Try simple query first without orderBy
      const unsubscribe = safeOnSnapshot(
        collection(db, 'books'),
        (snapshot: any) => {
          const booksList = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          })) as Book[];

          console.log('📚 Inventory Reports - Loaded books:', booksList.length, booksList);
          setBooks(booksList);
          setLoading(false);
        },
        (error: any) => {
          console.error('Inventory Reports - Error listening to books:', error);
          setLoading(false);
        }
      );

      return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    };

    const unsubscribe = loadBooks();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Calculate inventory statistics
  const calculateInventoryData = (): InventoryData => {
    console.log('🧮 Calculating inventory data from books:', books.length, books);
    
    let totalCopies = 0;
    let goodCondition = 0;
    let fairCondition = 0;
    let damagedCondition = 0;
    let lostCondition = 0;
    
    books.forEach((book, index) => {
      console.log(`📖 Processing book ${index + 1}/${books.length}: "${book.title}"`, {
        condition: book.condition,
        quantity: book.quantity,
        conditionDetails: book.conditionDetails
      });
      
      if (book.conditionDetails && book.conditionDetails.length > 0) {
        // Use detailed condition data - each conditionDetail represents one copy
        console.log(`📋 Using conditionDetails for "${book.title}":`, book.conditionDetails);
        totalCopies += book.conditionDetails.length;
        book.conditionDetails.forEach((detail, detailIndex) => {
          console.log(`  📄 Copy ${detailIndex + 1}: condition = ${detail.condition}`);
          switch (detail.condition) {
            case 'good':
              goodCondition++;
              break;
            case 'fair':
              fairCondition++;
              break;
            case 'damaged':
              damagedCondition++;
              break;
            case 'lost':
              lostCondition++;
              break;
          }
        });
      } else {
        // Use general condition data - quantity represents number of copies
        console.log(`📖 Using general condition for "${book.title}": ${book.condition || 'good'} (quantity: ${book.quantity})`);
        totalCopies += book.quantity;
        const condition = book.condition || 'good';
        switch (condition) {
          case 'good':
            goodCondition += book.quantity;
            break;
          case 'fair':
            fairCondition += book.quantity;
            break;
          case 'damaged':
            damagedCondition += book.quantity;
            break;
          case 'lost':
            lostCondition += book.quantity;
            break;
        }
      }
    });
    
    const totalBooks = books.length; // Number of unique titles
    const lowStock = books.filter(b => b.available <= 2 && b.available > 0).length;
    const criticalStock = books.filter(b => b.available === 0).length;
    
    // Estimate total value (assuming average price of 100,000 VND per book)
    const totalValue = totalCopies * 100000;

    const result = {
      totalBooks: totalCopies, // Show total copies instead of titles
      goodCondition,
      fairCondition,
      damagedCondition,
      lostCondition,
      lowStock,
      criticalStock,
      totalValue
    };
    
    console.log('📊 Final calculated inventory data:', result);
    console.log('🔢 Condition breakdown:', {
      totalCopies,
      goodCondition,
      fairCondition,
      damagedCondition,
      lostCondition,
      sum: goodCondition + fairCondition + damagedCondition + lostCondition
    });
    return result;
  };

  // Generate condition distribution data for pie chart
  const getConditionDistribution = () => {
    console.log('🔍 Books data for condition analysis:', books.length, books);
    
    const conditionCounts = books.reduce((acc, book, bookIndex) => {
      console.log(`📚 Processing book ${bookIndex + 1}/${books.length} "${book.title}":`, {
        condition: book.condition,
        quantity: book.quantity,
        conditionDetails: book.conditionDetails,
        conditionDetailsLength: book.conditionDetails?.length || 0
      });
      
      // Use detailed condition data if available, otherwise fall back to general condition
      if (book.conditionDetails && book.conditionDetails.length > 0) {
        console.log(`📋 Using conditionDetails for ${book.title}:`, book.conditionDetails);
        book.conditionDetails.forEach((detail, detailIndex) => {
          console.log(`  📄 Copy ${detailIndex + 1}: ${detail.condition}`);
          acc[detail.condition] = (acc[detail.condition] || 0) + 1;
        });
      } else {
        const condition = book.condition || 'good';
        console.log(`📖 Using general condition for ${book.title}: ${condition} (quantity: ${book.quantity})`);
        // Each book represents its quantity in copies
        acc[condition] = (acc[condition] || 0) + book.quantity;
      }
      
      console.log(`  🧮 Current accumulator after processing "${book.title}":`, { ...acc });
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Final condition counts before mapping:', conditionCounts);

    const conditionMapping: Record<'good' | 'fair' | 'damaged' | 'lost', { name: string; color: string }> = {
      good: { name: 'Tốt', color: '#22c55e' },
      fair: { name: 'Khá', color: '#3b82f6' },
      damaged: { name: 'Hư hỏng', color: '#ef4444' },
      lost: { name: 'Mất', color: '#6b7280' }
    };

    const totalCount = Object.values(conditionCounts).reduce((s, v) => s + v, 0);
    const result = Object.entries(conditionCounts)
      .map(([condition, count]) => {
        const key = condition as 'good' | 'fair' | 'damaged' | 'lost';
        return {
          name: conditionMapping[key]?.name || condition,
          value: count,
          color: conditionMapping[key]?.color || '#8b5cf6'
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort by count descending
    
    console.log('📈 Final chart data for pie chart:', result);
    return result;
  };

  // Generate monthly damage trends based on actual book condition updates
  const getMonthlyDamageData = (): MonthlyDamageData[] => {
    const months = parseInt(selectedPeriod);
    const endDate = new Date();
    const startDate = subMonths(endDate, months - 1);
    
    console.log('📅 Generating monthly damage data for period:', { startDate, endDate, months });
    
    // First, let's collect all damaged/lost books and see their timestamps
    const damagedBooks: any[] = [];
    const lostBooks: any[] = [];
    
    books.forEach(book => {
      if (book.conditionDetails && book.conditionDetails.length > 0) {
        book.conditionDetails.forEach(detail => {
          if (detail.condition === 'damaged') {
            damagedBooks.push({ book: book.title, detail, timestamp: detail.updatedAt });
          }
          if (detail.condition === 'lost') {
            lostBooks.push({ book: book.title, detail, timestamp: detail.updatedAt });
          }
        });
      } else {
        if (book.condition === 'damaged') {
          damagedBooks.push({ book: book.title, condition: book.condition, quantity: book.quantity, timestamp: book.updatedAt || book.createdAt });
        }
        if (book.condition === 'lost') {
          lostBooks.push({ book: book.title, condition: book.condition, quantity: book.quantity, timestamp: book.updatedAt || book.createdAt });
        }
      }
    });
    
    console.log('🔍 All damaged books found:', damagedBooks);
    console.log('🔍 All lost books found:', lostBooks);
    
    const monthlyData = eachMonthOfInterval({ start: startDate, end: endDate }).map(month => {
      const monthStr = format(month, 'yyyy-MM');
      console.log(`📊 Processing month: ${monthStr}`);
      
      let damaged = 0;
      let lost = 0;
      
      // Count damaged books for this month
      damagedBooks.forEach(item => {
        if (item.timestamp) {
          const updateDate = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
          const updateMonthStr = format(updateDate, 'yyyy-MM');
          
          if (updateMonthStr === monthStr) {
            damaged += item.quantity || 1;
            console.log(`  📈 Found damaged in ${monthStr}: ${item.book}`);
          }
        } else {
          // If no timestamp, assume it happened in the current month for demo
          const currentMonthStr = format(new Date(), 'yyyy-MM');
          if (monthStr === currentMonthStr) {
            damaged += item.quantity || 1;
            console.log(`  📈 Assumed damaged in current month: ${item.book}`);
          }
        }
      });
      
      // Count lost books for this month
      lostBooks.forEach(item => {
        if (item.timestamp) {
          const updateDate = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
          const updateMonthStr = format(updateDate, 'yyyy-MM');
          
          if (updateMonthStr === monthStr) {
            lost += item.quantity || 1;
            console.log(`  📈 Found lost in ${monthStr}: ${item.book}`);
          }
        } else {
          // If no timestamp, assume it happened in the current month for demo
          const currentMonthStr = format(new Date(), 'yyyy-MM');
          if (monthStr === currentMonthStr) {
            lost += item.quantity || 1;
            console.log(`  📈 Assumed lost in current month: ${item.book}`);
          }
        }
      });
      
      console.log(`📈 Month ${monthStr} - Damaged: ${damaged}, Lost: ${lost}`);
      
      return {
        month: format(month, 'MMM yyyy', { locale: vi }),
        damaged,
        lost,
        total: damaged + lost
      };
    });

    console.log('📊 Final monthly damage data:', monthlyData);
    
    // If no data found but we know there are damaged/lost books, show them in current month
    const totalDamagedFound = damagedBooks.length;
    const totalLostFound = lostBooks.length;
    const totalInChart = monthlyData.reduce((sum, month) => sum + month.total, 0);
    
    if (totalInChart === 0 && (totalDamagedFound > 0 || totalLostFound > 0)) {
      console.log('⚠️ No timestamp data found but damaged/lost books exist. Adding to current month.');
      const currentMonth = format(new Date(), 'MMM yyyy', { locale: vi });
      const currentMonthIndex = monthlyData.findIndex(m => m.month === currentMonth);
      
      if (currentMonthIndex >= 0) {
        monthlyData[currentMonthIndex].damaged = totalDamagedFound;
        monthlyData[currentMonthIndex].lost = totalLostFound;
        monthlyData[currentMonthIndex].total = totalDamagedFound + totalLostFound;
      }
    }
    
    return monthlyData;
  };

  // Generate genre-based inventory analysis
  const getGenreInventoryData = (): GenreInventoryData[] => {
    console.log('📚 Generating genre inventory data from books:', books.length);
    
    const genreMap = new Map<string, GenreInventoryData>();
    
    books.forEach((book, index) => {
      const genre = book.genre || 'Khác';
      console.log(`📖 Processing book ${index + 1}: "${book.title}" - Genre: ${genre}`);
      
      if (!genreMap.has(genre)) {
        genreMap.set(genre, {
          genre,
          good: 0,
          damaged: 0,
          lost: 0,
          total: 0,
          value: 0
        });
      }
      
      const data = genreMap.get(genre)!;
      
      // Use conditionDetails if available, otherwise use general condition
      if (book.conditionDetails && book.conditionDetails.length > 0) {
        console.log(`  📋 Using conditionDetails for ${book.title}:`, book.conditionDetails);
        
        // Count actual copies
        data.total += book.conditionDetails.length;
        data.value += book.conditionDetails.length * 100000; // Estimated value per copy
        
        book.conditionDetails.forEach(detail => {
          switch (detail.condition) {
            case 'good':
            case 'fair': // Group fair with good for genre analysis
              data.good++;
              break;
            case 'damaged':
              data.damaged++;
              break;
            case 'lost':
              data.lost++;
              break;
          }
        });
      } else {
        console.log(`  📖 Using general condition for ${book.title}: ${book.condition} (qty: ${book.quantity})`);
        
        // Use general condition and quantity
        data.total += book.quantity;
        data.value += book.quantity * 100000; // Estimated value
        
        const condition = book.condition || 'good';
        switch (condition) {
          case 'good':
          case 'fair': // Group fair with good for genre analysis
            data.good += book.quantity;
            break;
          case 'damaged':
            data.damaged += book.quantity;
            break;
          case 'lost':
            data.lost += book.quantity;
            break;
        }
      }
      
      console.log(`  📊 Updated genre data for ${genre}:`, { ...data });
    });

    const result = Array.from(genreMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 genres
    
    console.log('📈 Final genre inventory data:', result);
    return result;
  };

  // Export to CSV function
  const exportToCSV = () => {
    const inventoryData = calculateInventoryData();
    const genreData = getGenreInventoryData();
    
    let csv = 'BÁNG CÁO TỒN KHO THƯ VIỆN\n\n';
    csv += 'Thống kê tổng quan\n';
    csv += 'Chỉ số,Giá trị\n';
    csv += `Tổng số sách,${inventoryData.totalBooks}\n`;
    csv += `Tình trạng tốt,${inventoryData.goodCondition}\n`;
    csv += `Sách hư hỏng,${inventoryData.damagedCondition}\n`;
    csv += `Sách mất,${inventoryData.lostCondition}\n`;
    csv += `Sách sắp hết,${inventoryData.lowStock}\n`;
    csv += `Sách hết hàng,${inventoryData.criticalStock}\n`;
    csv += `Giá trị ước tính,${inventoryData.totalValue.toLocaleString('vi-VN')} VND\n\n`;
    
    csv += 'Phân tích theo thể loại\n';
    csv += 'Thể loại,Tổng số,Tình trạng tốt,Hư hỏng,Mất,Giá trị (VND)\n';
    genreData.forEach(genre => {
      csv += `${genre.genre},${genre.total},${genre.good},${genre.damaged},${genre.lost},${genre.value.toLocaleString('vi-VN')}\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bao-cao-ton-kho-${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inventoryData = calculateInventoryData();
  const conditionData = getConditionDistribution();
  const monthlyDamageData = getMonthlyDamageData();
  const genreData = getGenreInventoryData();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Báo cáo tồn kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Đang tải dữ liệu...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (books.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Báo cáo tồn kho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold mb-2">Chưa có dữ liệu sách</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Hệ thống chưa có sách nào được thêm vào. Hãy thêm sách để bắt đầu xem báo cáo chi tiết về tồn kho.
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <a href="/books">
                    <Package className="h-4 w-4 mr-2" />
                    Thêm sách mới
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/reports?tab=bulk">
                    <Upload className="h-4 w-4 mr-2" />
                    Import từ CSV
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Start Guide */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">🚀 Hướng dẫn nhanh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">1️⃣</span>
                </div>
                <h4 className="font-medium mb-2">Thêm sách</h4>
                <p className="text-sm text-muted-foreground">
                  Vào trang Kho sách để thêm sách mới vào hệ thống
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">2️⃣</span>
                </div>
                <h4 className="font-medium mb-2">Cập nhật tình trạng</h4>
                <p className="text-sm text-muted-foreground">
                  Đánh dấu tình trạng sách (tốt, hư hỏng, mất)
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">3️⃣</span>
                </div>
                <h4 className="font-medium mb-2">Xem báo cáo</h4>
                <p className="text-sm text-muted-foreground">
                  Theo dõi tồn kho và xu hướng qua biểu đồ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Báo cáo tồn kho nâng cao
              </CardTitle>
              <CardDescription>
                Phân tích chi tiết tình trạng và xu hướng tồn kho thư viện
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={refreshData} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button onClick={exportToCSV} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Xuất báo cáo CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng số cuốn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryData.totalBooks}</div>
            <Badge variant="secondary" className="mt-1">
              <Package className="h-3 w-3 mr-1" />
              {inventoryData.totalBooks > 0 ? '100%' : '0%'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tình trạng tốt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inventoryData.goodCondition}</div>
            <Badge variant="outline" className="mt-1 text-green-600 border-green-200">
              {inventoryData.totalBooks > 0 ? Math.round((inventoryData.goodCondition / inventoryData.totalBooks) * 100) : 0}%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Khá
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inventoryData.fairCondition || 0}</div>
            <Badge variant="outline" className="mt-1 text-blue-600 border-blue-200">
              {inventoryData.totalBooks > 0 ? Math.round(((inventoryData.fairCondition || 0) / inventoryData.totalBooks) * 100) : 0}%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hư hỏng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inventoryData.damagedCondition}</div>
            <Badge variant="outline" className="mt-1 text-yellow-600 border-yellow-200">
              {inventoryData.totalBooks > 0 ? Math.round((inventoryData.damagedCondition / inventoryData.totalBooks) * 100) : 0}%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inventoryData.lostCondition}</div>
            <Badge variant="outline" className="mt-1 text-red-600 border-red-200">
              {inventoryData.totalBooks > 0 ? Math.round((inventoryData.lostCondition / inventoryData.totalBooks) * 100) : 0}%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sắp hết hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inventoryData.lowStock}</div>
            <Badge variant="outline" className="mt-1 text-orange-600 border-orange-200">
              <TrendingDown className="h-3 w-3 mr-1" />
              Ít hàng
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Giá trị ước tính
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(inventoryData.totalValue / 1000000)}M</div>
            <Badge variant="secondary" className="mt-1">
              VND
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <Tabs defaultValue="condition" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="condition">Phân bố tình trạng</TabsTrigger>
          <TabsTrigger value="trends">Xu hướng hư hỏng</TabsTrigger>
          <TabsTrigger value="genres">Phân tích thể loại</TabsTrigger>
        </TabsList>

        <TabsContent value="condition" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Phân bố tình trạng sách</CardTitle>
                <CardDescription>Tỷ lệ sách theo tình trạng hiện tại</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={conditionData}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={({ name, percent, value }) => {
                        // Only show label if percentage is >= 5% to avoid overlap
                        if (percent * 100 >= 5) {
                          return `${name}: ${value} cuốn`;
                        }
                        return '';
                      }}
                      outerRadius={120}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={3}
                    >
                      {conditionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                      formatter={(value: any, name: any) => {
                        const total = conditionData.reduce((sum, item) => sum + (item.value || 0), 0);
                        const percent = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
                        return [`${value} cuốn (${percent}%)`, 'Số lượng'];
                      }}
                      labelFormatter={(label) => `Tình trạng: ${label}`}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={50}
                      iconType="circle"
                      wrapperStyle={{ 
                        paddingTop: '30px',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                      formatter={(value, entry) => {
                        const payloadVal = entry?.payload?.value ?? 0;
                        const total = conditionData.reduce((sum, item) => sum + (item.value || 0), 0);
                        const percent = total > 0 ? ((payloadVal / total) * 100).toFixed(1) : '0.0';
                        return `${value}: ${payloadVal} cuốn (${percent}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tình trạng theo số lượng</CardTitle>
                <CardDescription>So sánh số lượng sách theo tình trạng</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart 
                    data={conditionData} 
                    margin={{ top: 30, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 13, fontWeight: '500' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                      label={{ 
                        value: 'Số lượng (cuốn)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fontSize: '12px' }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                      formatter={(value: any, name: any, props: any) => {
                        const total = conditionData.reduce((sum, item) => sum + (item.value || 0), 0);
                        const percent = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
                        return [`${value} cuốn (${percent}%)`, 'Số lượng'];
                      }}
                      labelFormatter={(label) => `Tình trạng: ${label}`}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[6, 6, 0, 0]}
                      fill="#8884d8"
                    >
                      {conditionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <label className="text-sm font-medium">Khoảng thời gian:</label>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 tháng</SelectItem>
                <SelectItem value="6">6 tháng</SelectItem>
                <SelectItem value="12">12 tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Xu hướng sách hư hỏng/mất theo thời gian</CardTitle>
              <CardDescription>
                Theo dõi số lượng sách bị hư hỏng và mất trong {selectedPeriod} tháng gần nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyDamageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ 
                      value: 'Số lượng sách', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      `${value} cuốn`,
                      name === 'damaged' ? 'Sách hư hỏng' : name === 'lost' ? 'Sách mất' : name
                    ]}
                    labelFormatter={(label) => `Tháng: ${label}`}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="damaged" 
                    stackId="1" 
                    stroke="#eab308" 
                    fill="#eab308" 
                    fillOpacity={0.6}
                    name="Hư hỏng"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lost" 
                    stackId="1" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                    name="Mất"
                  />
                </AreaChart>
              </ResponsiveContainer>
              
              {/* Show message if no damage data */}
              {monthlyDamageData.every(item => item.total === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <h4 className="font-medium mb-2">Chưa có dữ liệu hư hỏng/mất</h4>
                  <p className="text-sm">
                    Trong {selectedPeriod} tháng gần nhất chưa có sách nào bị hư hỏng hoặc mất.
                    <br />
                    Dữ liệu sẽ hiển thị khi có cập nhật tình trạng sách.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="genres" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phân tích tồn kho theo thể loại</CardTitle>
              <CardDescription>Top 10 thể loại có nhiều sách nhất và tình trạng của chúng</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={genreData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="genre" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="good" stackId="a" fill="#22c55e" name="Tốt" />
                  <Bar dataKey="damaged" stackId="a" fill="#eab308" name="Hư hỏng" />
                  <Bar dataKey="lost" stackId="a" fill="#ef4444" name="Mất" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bảng chi tiết theo thể loại</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Thể loại</th>
                      <th className="text-right p-2">Tổng số</th>
                      <th className="text-right p-2">Tốt</th>
                      <th className="text-right p-2">Hư hỏng</th>
                      <th className="text-right p-2">Mất</th>
                      <th className="text-right p-2">Giá trị (VND)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {genreData.map((genre, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{genre.genre}</td>
                        <td className="p-2 text-right">{genre.total}</td>
                        <td className="p-2 text-right text-green-600">{genre.good}</td>
                        <td className="p-2 text-right text-yellow-600">{genre.damaged}</td>
                        <td className="p-2 text-right text-red-600">{genre.lost}</td>
                        <td className="p-2 text-right font-mono">
                          {genre.value.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Edit3, 
  Save, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Book } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

interface BulkOperation {
  id: string;
  operation: 'update-quantity' | 'update-condition' | 'update-price';
  value: string;
  bookIds: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  processed: number;
  total: number;
}

export function BulkOperations() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>({
    id: '',
    operation: 'update-quantity',
    value: '',
    bookIds: []
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load books data
  const loadBooks = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'books'));
      const booksList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      setBooks(booksList);
      setFilteredBooks(booksList);
    } catch (error) {
      console.error('Error loading books:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách sách",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter books based on search and condition
  const filterBooks = () => {
    let filtered = books;
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(search) ||
        book.author.toLowerCase().includes(search) ||
        (book.libraryId && book.libraryId.toLowerCase().includes(search)) ||
        book.id.toLowerCase().includes(search)
      );
    }
    
    // Filter by condition
    if (filterCondition !== 'all') {
      filtered = filtered.filter(book => (book.condition || 'good') === filterCondition);
    }
    
    setFilteredBooks(filtered);
  };

  // Update filters when search term or condition changes
  React.useEffect(() => {
    filterBooks();
  }, [searchTerm, filterCondition, books]);

  // Export books to CSV
  const exportBooksCSV = () => {
    const csvHeaders = [
      'ID',
      'Tiêu đề',
      'Tác giả',
      'Thể loại',
      'Mã thư viện',
      'Số lượng',
      'Còn lại',
      'Tình trạng',
      'Ngày tạo'
    ];

    const csvData = books.map(book => [
      book.id,
      `"${book.title}"`,
      `"${book.author}"`,
      `"${book.genre || ''}"`,
      book.libraryId || '',
      book.quantity,
      book.available,
      book.condition || 'good',
      book.createdAt ? new Date((book.createdAt as any)?.seconds * 1000).toLocaleDateString('vi-VN') : ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sach-thu-vien-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Thành công",
      description: `Đã xuất ${books.length} sách ra file CSV`,
    });
  };

  // Export inventory template
  const exportTemplate = () => {
    const template = [
      ['ID', 'Số lượng mới', 'Tình trạng mới', 'Ghi chú'],
      ['book-id-1', '10', 'good', 'Cập nhật tồn kho'],
      ['book-id-2', '5', 'damaged', 'Một số cuốn bị hư hỏng'],
      ['book-id-3', '0', 'lost', 'Sách bị mất']
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mau-cap-nhat-ton-kho.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Thành công",
      description: "Đã tải file mẫu CSV",
    });
  };

  // Handle file upload and preview
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file CSV",
        variant: "destructive"
      });
      return;
    }

    setImportFile(file);
    
    // Read and preview CSV
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = { _rowIndex: index + 2 }; // +2 because of 0-index and header
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          return row;
        });

        setImportPreview(data.slice(0, 10)); // Show first 10 rows
        
        toast({
          title: "Thành công",
          description: `Đã tải file với ${data.length} dòng dữ liệu`,
        });
      } catch (error) {
        toast({
          title: "Lỗi",
          description: "Không thể đọc file CSV",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Process CSV import
  const processImport = async () => {
    if (!importFile) return;

    setLoading(true);
    setProgress(0);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          
          const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, i) => {
              row[header] = values[i] || '';
            });
            return row;
          });

          const result: ImportResult = {
            success: 0,
            failed: 0,
            errors: [],
            processed: 0,
            total: data.length
          };

          // Process in batches to avoid Firestore limits
          const batchSize = 10;
          const batches = [];
          
          for (let i = 0; i < data.length; i += batchSize) {
            batches.push(data.slice(i, i + batchSize));
          }

          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = writeBatch(db);
            const currentBatch = batches[batchIndex];

            for (const row of currentBatch) {
              try {
                const bookId = row['ID'] || row['id'];
                if (!bookId) {
                  result.failed++;
                  result.errors.push(`Dòng ${result.processed + 1}: Thiếu ID sách`);
                  result.processed++;
                  continue;
                }

                // Find book
                const book = books.find(b => b.id === bookId || b.libraryId === bookId);
                if (!book) {
                  result.failed++;
                  result.errors.push(`Dòng ${result.processed + 1}: Không tìm thấy sách với ID ${bookId}`);
                  result.processed++;
                  continue;
                }

                // Prepare update data
                const updateData: any = {};
                
                // Update quantity
                const newQuantity = row['Số lượng mới'] || row['quantity'];
                if (newQuantity && !isNaN(parseInt(newQuantity))) {
                  const quantity = parseInt(newQuantity);
                  updateData.quantity = quantity;
                  // Adjust available if necessary (don't exceed new quantity)
                  if (book.available > quantity) {
                    updateData.available = quantity;
                  }
                }

                // Update condition
                const newCondition = row['Tình trạng mới'] || row['condition'];
                if (newCondition && ['good', 'damaged', 'lost'].includes(newCondition)) {
                  updateData.condition = newCondition;
                }

                // Only update if we have changes
                if (Object.keys(updateData).length > 0) {
                  updateData.updatedAt = new Date();
                  batch.update(doc(db, 'books', book.id), updateData);
                  result.success++;
                } else {
                  result.failed++;
                  result.errors.push(`Dòng ${result.processed + 1}: Không có dữ liệu hợp lệ để cập nhật`);
                }

                result.processed++;
              } catch (error) {
                result.failed++;
                result.errors.push(`Dòng ${result.processed + 1}: ${error}`);
                result.processed++;
              }
            }

            // Commit batch
            if (result.success > (batchIndex * batchSize)) {
              await batch.commit();
            }

            // Update progress
            setProgress(Math.round((result.processed / result.total) * 100));
          }

          setImportResult(result);
          
          if (result.success > 0) {
            await loadBooks(); // Reload books
            toast({
              title: "Hoàn thành",
              description: `Đã cập nhật ${result.success} sách thành công`,
            });
          }

        } catch (error) {
          console.error('Import error:', error);
          toast({
            title: "Lỗi",
            description: "Có lỗi xảy ra khi xử lý file",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
          setProgress(0);
        }
      };
      
      reader.readAsText(importFile, 'UTF-8');
    } catch (error) {
      console.error('Import error:', error);
      setLoading(false);
      setProgress(0);
    }
  };

  // Bulk update operations
  const executeBulkOperation = async () => {
    if (selectedBooks.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một sách",
        variant: "destructive"
      });
      return;
    }

    if (!bulkOperation.value) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập giá trị cập nhật",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      selectedBooks.forEach(bookId => {
        const updateData: any = { updatedAt: new Date() };
        
        switch (bulkOperation.operation) {
          case 'update-quantity':
            const quantity = parseInt(bulkOperation.value);
            if (!isNaN(quantity)) {
              updateData.quantity = quantity;
              // Adjust available proportionally
              const book = books.find(b => b.id === bookId);
              if (book) {
                const ratio = book.available / book.quantity;
                updateData.available = Math.min(quantity, Math.round(quantity * ratio));
              }
            }
            break;
          case 'update-condition':
            if (['good', 'damaged', 'lost'].includes(bulkOperation.value)) {
              updateData.condition = bulkOperation.value;
            }
            break;
        }
        
        batch.update(doc(db, 'books', bookId), updateData);
      });

      await batch.commit();
      await loadBooks();
      
      setSelectedBooks([]);
      setBulkOperation({ ...bulkOperation, value: '' });
      
      toast({
        title: "Thành công",
        description: `Đã cập nhật ${selectedBooks.length} sách`,
      });
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast({
        title: "Lỗi",
        description: "Không thể thực hiện cập nhật hàng loạt",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Quản lý hàng loạt & Import/Export
          </CardTitle>
          <CardDescription>
            Cập nhật số lượng, tình trạng sách hàng loạt và import/export dữ liệu CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={loadBooks} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tải dữ liệu ({books.length} sách)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Xuất dữ liệu</TabsTrigger>
          <TabsTrigger value="import">Nhập dữ liệu</TabsTrigger>
          <TabsTrigger value="bulk">Cập nhật hàng loạt</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  Xuất danh sách sách
                </CardTitle>
                <CardDescription>
                  Tải về toàn bộ danh sách sách dưới dạng CSV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  File CSV sẽ bao gồm:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>ID sách và mã thư viện</li>
                    <li>Thông tin cơ bản (tiêu đề, tác giả, thể loại)</li>
                    <li>Số lượng và tình trạng hiện tại</li>
                    <li>Ngày tạo</li>
                  </ul>
                </div>
                <Button 
                  onClick={exportBooksCSV}
                  disabled={books.length === 0}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Xuất CSV ({books.length} sách)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Tải file mẫu
                </CardTitle>
                <CardDescription>
                  Tải về file CSV mẫu để cập nhật tồn kho
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  File mẫu bao gồm:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Cấu trúc cột chuẩn</li>
                    <li>Ví dụ dữ liệu mẫu</li>
                    <li>Hướng dẫn điền thông tin</li>
                  </ul>
                </div>
                <Button 
                  onClick={exportTemplate}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Tải file mẫu
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-orange-600" />
                Nhập dữ liệu từ CSV
              </CardTitle>
              <CardDescription>
                Cập nhật số lượng và tình trạng sách từ file CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvFile">Chọn file CSV</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <p className="text-sm text-muted-foreground">
                  File CSV phải có các cột: ID, Số lượng mới, Tình trạng mới
                </p>
              </div>

              {importFile && (
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    Đã tải file: <strong>{importFile.name}</strong>
                  </AlertDescription>
                </Alert>
              )}

              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <Label>Xem trước dữ liệu (10 dòng đầu)</Label>
                  <div className="border rounded-md overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {Object.keys(importPreview[0]).filter(k => k !== '_rowIndex').map(key => (
                            <th key={key} className="text-left p-2 font-medium">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, index) => (
                          <tr key={index} className="border-b">
                            {Object.entries(row).filter(([k]) => k !== '_rowIndex').map(([key, value]) => (
                              <td key={key} className="p-2">{value as string}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Đang xử lý...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-600">{importResult.success}</div>
                      <div className="text-sm text-green-700">Thành công</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-red-600">{importResult.failed}</div>
                      <div className="text-sm text-red-700">Thất bại</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <FileSpreadsheet className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-600">{importResult.processed}</div>
                      <div className="text-sm text-blue-700">Đã xử lý</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <Label>Lỗi chi tiết</Label>
                      <Textarea
                        value={importResult.errors.join('\n')}
                        readOnly
                        rows={Math.min(10, importResult.errors.length)}
                      />
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={processImport}
                disabled={!importFile || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Bắt đầu nhập dữ liệu
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-purple-600" />
                Cập nhật hàng loạt
              </CardTitle>
              <CardDescription>
                Chọn nhiều sách và cập nhật cùng lúc
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Loại cập nhật</Label>
                  <Select
                    value={bulkOperation.operation}
                    onValueChange={(value: 'update-quantity' | 'update-condition') =>
                      setBulkOperation({ ...bulkOperation, operation: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="update-quantity">Cập nhật số lượng</SelectItem>
                      <SelectItem value="update-condition">Cập nhật tình trạng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Giá trị mới</Label>
                  {bulkOperation.operation === 'update-condition' ? (
                    <Select
                      value={bulkOperation.value}
                      onValueChange={(value) => setBulkOperation({ ...bulkOperation, value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tình trạng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Tốt</SelectItem>
                        <SelectItem value="damaged">Hư hỏng</SelectItem>
                        <SelectItem value="lost">Mất</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      placeholder="Nhập số lượng"
                      value={bulkOperation.value}
                      onChange={(e) => setBulkOperation({ ...bulkOperation, value: e.target.value })}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sách đã chọn ({selectedBooks.length})</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBooks(filteredBooks.map(b => b.id))}
                      disabled={filteredBooks.length === 0}
                    >
                      Chọn tất cả
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBooks([])}
                      disabled={selectedBooks.length === 0}
                    >
                      Bỏ chọn
                    </Button>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Tìm kiếm sách..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select
                    value={filterCondition}
                    onValueChange={setFilterCondition}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả tình trạng</SelectItem>
                      <SelectItem value="good">Tốt</SelectItem>
                      <SelectItem value="damaged">Hư hỏng</SelectItem>
                      <SelectItem value="lost">Mất</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  {books.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Vui lòng tải dữ liệu sách trước
                    </div>
                  ) : filteredBooks.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Không tìm thấy sách nào
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredBooks.map(book => (
                        <label
                          key={book.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBooks.includes(book.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBooks([...selectedBooks, book.id]);
                              } else {
                                setSelectedBooks(selectedBooks.filter(id => id !== book.id));
                              }
                            }}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{book.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {book.author} • {book.quantity} cuốn • {book.condition || 'good'}
                              {book.libraryId && ` • ${book.libraryId}`}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {book.available}/{book.quantity}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Hiển thị {filteredBooks.length} / {books.length} sách
                </div>
              </div>

              <Button 
                onClick={executeBulkOperation}
                disabled={selectedBooks.length === 0 || !bulkOperation.value || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Cập nhật {selectedBooks.length} sách
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
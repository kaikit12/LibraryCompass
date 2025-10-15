
"use client";

import { useState, useMemo, useEffect } from "react";
import { Book, Reader } from "@/lib/types";
import { genres } from "@/lib/genres";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, PlusCircle, Search, QrCode, Sparkles, Loader2, LayoutGrid, Table as TableIcon, Scan, X, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { BorrowDialog } from "./borrow-dialog";
import { QRCodeDialog } from "./qr-code-dialog";
import { useAuth } from "@/context/auth-context";
import { PersonalizedRecommendationsDialog } from "./recommendations-dialog";
import { cn } from "@/lib/utils";
import { groqChat } from "@/app/actions/groq-chat";
import Image from "next/image";
import { BookCardView } from "./book-card-view";
import { SearchFilters, SearchFiltersState } from "./search-filters";
import { BarcodeScanner } from "./barcode-scanner";
import { SeriesView } from "./series-view";

interface BookActionsProps {
  highlightedBookId?: string | null;
}

export function BookActions() {
  const { user } = useAuth();
  const currentUserRole = user?.role;

  const [books, setBooks] = useState<Book[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [customGenres, setCustomGenres] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFiltersState>({
    searchTerm: '',
    genre: 'all',
    status: 'all',
    publicationYear: 'all',
    isbn: '',
    sortBy: 'newest',
    minRating: '0',
    series: 'all',
  });
  const [viewMode, setViewMode] = useState<'table' | 'card' | 'series'>('card');
  const { toast } = useToast();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isBorrowOpen, setIsBorrowOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isRecoDialogOpen, setIsRecoDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [editingBook, setEditingBook] = useState<Partial<Book> | null>(null);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [customGenre, setCustomGenre] = useState("");
  const [isLoadingISBN, setIsLoadingISBN] = useState(false);

  
  useEffect(() => {
    const unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
      const liveBooks = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
              id: doc.id, 
              ...data,
          } as Book
      });
      setBooks(liveBooks);
    });
    
    const unsubscribeReaders = onSnapshot(collection(db, "users"), (snapshot) => {
        const liveReaders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reader));
        setReaders(liveReaders);
    });

    // Load custom genres
    const unsubscribeGenres = onSnapshot(collection(db, "customGenres"), (snapshot) => {
      const loadedGenres = snapshot.docs.map(doc => doc.data().name as string);
      setCustomGenres([...new Set(loadedGenres)]); // Remove duplicates
    });

    return () => {
        unsubscribeBooks();
        unsubscribeReaders();
        unsubscribeGenres();
    };
  }, [user]);

  const enrichedReaders = useMemo(() => {
    if (!readers.length || !books.length) return [];
    
    const bookTitleMap = new Map(books.map(book => [book.id, book.title]));

    return readers.map(reader => {
        const borrowedBookTitles = (reader.borrowedBooks || [])
            .map(bookId => bookTitleMap.get(bookId) || 'Unknown Book')
            .concat(reader.borrowingHistory || []); 
            
        const uniqueTitles = [...new Set(borrowedBookTitles)];

        return {
            ...reader,
            borrowingHistory: uniqueTitles,
        }
    });
  }, [readers, books]);

  // Calculate available series for filtering
  const availableSeries = useMemo(() => {
    return Array.from(new Set(books.map(b => b.series).filter(Boolean))) as string[];
  }, [books]);

  const filteredBooks = useMemo(() => {
    let result = books.filter(book => {
      const lowerCaseSearch = filters.searchTerm.toLowerCase();
      const searchMatch = book.title.toLowerCase().includes(lowerCaseSearch) || 
                        book.author.toLowerCase().includes(lowerCaseSearch) ||
                        (book.libraryId && book.libraryId.toLowerCase().includes(lowerCaseSearch));
      
      const statusMatch = filters.status === 'all' || book.status.toLowerCase() === filters.status.toLowerCase();
      
      // Genre match: check if book has the selected genre in either genres array or genre field
      const bookGenres = book.genres || [book.genre].filter(Boolean);
      const genreMatch = filters.genre === 'all' || bookGenres.includes(filters.genre);
      
      // ISBN filter
      const isbnMatch = !filters.isbn || 
                       (book.isbn && book.isbn.toLowerCase().includes(filters.isbn.toLowerCase()));
      
      // Publication year filter
      const yearMatch = filters.publicationYear === 'all' || !filters.publicationYear ||
                       (book.publicationYear && book.publicationYear.toString() === filters.publicationYear);
      
      // Rating filter
      const ratingMatch = parseFloat(filters.minRating) === 0 || 
                         (book.rating && book.rating >= parseFloat(filters.minRating));
      
      // Series filter
      const seriesMatch = filters.series === 'all' || book.series === filters.series;
      
      return searchMatch && statusMatch && genreMatch && isbnMatch && yearMatch && ratingMatch && seriesMatch;
    });

    // Sorting
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => (b.publicationYear || 0) - (a.publicationYear || 0));
        break;
      case 'oldest':
        result.sort((a, b) => (a.publicationYear || 0) - (b.publicationYear || 0));
        break;
      case 'popular':
        result.sort((a, b) => (b.totalBorrows || 0) - (a.totalBorrows || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'series-order':
        result.sort((a, b) => {
          // First sort by series name
          if (a.series !== b.series) {
            return (a.series || '').localeCompare(b.series || '');
          }
          // Then sort by order within the series
          return (a.seriesOrder || 0) - (b.seriesOrder || 0);
        });
        break;
      default:
        break;
    }

    return result;
  }, [books, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.genre !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.isbn) count++;
    if (filters.publicationYear) count++;
    if (parseFloat(filters.minRating) > 0) count++;
    if (filters.series !== 'all') count++;
    return count;
  }, [filters]);

  const resetDialogState = () => {
      setEditingBook(null);
      setCustomGenre("");
      setIsAddEditOpen(false);
  }

  const handleOpenAdd = () => {
    setEditingBook({ quantity: 1, available: 1, lateFeePerDay: 1 });
    setCustomGenre("");
    setIsAddEditOpen(true);
  }

  const handleOpenEdit = (book: Book) => {
    setEditingBook(book);
    // Check if genre is a custom one (not in predefined list)
    if (!genres.includes(book.genre) && book.genre !== 'Khác') {
      setCustomGenre(book.genre);
      setEditingBook({...book, genre: 'Khác'});
    } else {
      setCustomGenre("");
    }
    setIsAddEditOpen(true);
  }
  
  const handleSaveBook = async () => {
    // Get genres array - filter out undefined/null/empty
    let finalGenres: string[] = (editingBook?.genres || [editingBook?.genre]).filter((g): g is string => Boolean(g));
    
    // Handle custom genre input
    if (customGenre.trim()) {
      const customGenresArray = customGenre.split(',').map(g => g.trim()).filter(Boolean);
      
      // Remove "Khác" from finalGenres and add custom genres
      finalGenres = finalGenres.filter(g => g !== 'Khác');
      finalGenres = [...new Set([...finalGenres, ...customGenresArray])]; // Remove duplicates
      
      // Save custom genres to Firestore for future use
      for (const customG of customGenresArray) {
        if (customG && !genres.includes(customG)) {
          try {
            await addDoc(collection(db, 'customGenres'), {
              name: customG,
              createdAt: new Date(),
              createdBy: user?.uid || 'unknown'
            });
          } catch (error) {
            console.error('Error saving custom genre:', error);
          }
        }
      }
    }
    
    if (!editingBook?.title || !editingBook?.author || finalGenres.length === 0 || editingBook?.quantity === undefined) {
      toast({ variant: 'destructive', title: '❌ Lỗi', description: 'Vui lòng nhập đầy đủ các trường bắt buộc (tiêu đề, tác giả, thể loại, số lượng).'});
      return;
    }
    
    const quantity = Number(editingBook.quantity);
    const available = editingBook.id ? Number(editingBook.available) : quantity;
    const lateFee = Number(editingBook.lateFeePerDay) || 0;

     if (isNaN(quantity) || quantity < 0) {
  toast({ variant: 'destructive', title: '❌ Lỗi', description: 'Số lượng phải là số không âm.' });
      return;
    }
     if (isNaN(lateFee) || lateFee < 0) {
  toast({ variant: 'destructive', title: '❌ Lỗi', description: 'Phí trễ hạn phải là số không âm.' });
      return;
    }

    
    if (editingBook.id && available > quantity) {
  toast({ variant: 'destructive', title: '❌ Lỗi logic', description: `Số sách còn lại (${available}) không thể lớn hơn tổng số sách (${quantity}). Vui lòng kiểm tra lại số lượng.` });
      return;
    }

    const bookData: Omit<Book, 'id' | 'status' | 'available'> & { available?: number, status?: 'Available' | 'Borrowed'} = {
        title: editingBook.title,
        author: editingBook.author,
        genre: finalGenres[0] || '', // Keep first genre for backward compatibility
        genres: finalGenres, // New: multiple genres
        quantity: quantity,
        libraryId: editingBook.libraryId || '',
        lateFeePerDay: lateFee,
        imageUrl: editingBook.imageUrl || '',
        description: editingBook.description || '',
        isbn: editingBook.isbn || '',
        publicationYear: editingBook.publicationYear || undefined,
        rating: editingBook.rating || 0,
        reviewCount: editingBook.reviewCount || 0,
        totalBorrows: editingBook.totalBorrows || 0,
        // Series data
        series: editingBook.series || undefined,
        seriesOrder: editingBook.seriesOrder || undefined,
        totalInSeries: editingBook.totalInSeries || undefined,
    };

    try {
      if (editingBook.id) {
        // Edit existing book
        const bookRef = doc(db, 'books', editingBook.id);
        
        // Calculate new available count if quantity changed
        // Formula: new_available = old_available + (new_quantity - old_quantity)
        const oldBook = books.find(b => b.id === editingBook.id);
        const oldQuantity = oldBook?.quantity || 0;
        const quantityDiff = quantity - oldQuantity;
        const newAvailable = Math.max(0, available + quantityDiff);
        
        await updateDoc(bookRef, {
          ...bookData,
          available: newAvailable,
          status: newAvailable > 0 ? 'Available' : 'Borrowed',
        });
  toast({ title: '✅ Cập nhật sách', description: `"${editingBook.title}" đã được cập nhật.`});
      } else {
        // Add new book
        bookData.available = available;
        bookData.status = available > 0 ? 'Available' : 'Borrowed';
        await addDoc(collection(db, 'books'), bookData);
  toast({ title: '✅ Thêm sách', description: `"${editingBook.title}" đã được thêm vào thư viện.`});
      }
      resetDialogState();
    } catch {
  toast({ variant: 'destructive', title: '❌ Lỗi', description: 'Có lỗi khi lưu thông tin sách.'});
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    try {
      // Check if book is currently borrowed
      const bookToDel = books.find(b => b.id === bookId);
      if (bookToDel && bookToDel.available < bookToDel.quantity) {
        toast({ 
          variant: 'destructive', 
          title: '❌ Không thể xóa', 
          description: `Sách đang được mượn (${bookToDel.quantity - bookToDel.available} cuốn). Vui lòng đợi người dùng trả sách trước khi xóa.`
        });
        return;
      }
      
      await deleteDoc(doc(db, 'books', bookId));
      toast({ title: '✅ Xóa sách', description: 'Cuốn sách đã được xóa khỏi thư viện.'});
    } catch {
      toast({ variant: 'destructive', title: '❌ Lỗi', description: 'Không thể xóa sách.'});
    }
  }

  const handleGenerateDescription = async () => {
      if (!editingBook?.title || !editingBook?.author) {
          toast({ variant: 'destructive', title: '❌ Lỗi', description: 'Vui lòng nhập tiêu đề và tác giả trước.'});
          return;
      }
      setIsGeneratingDesc(true);
      try {
          const prompt = `Viết đoạn tóm tắt ngắn gọn cho cuốn sách "${editingBook.title}" của tác giả ${editingBook.author}.`;
          const result = await groqChat({ prompt });
          setEditingBook(prev => ({...prev, description: result.content}));
    } catch {
           toast({ variant: 'destructive', title: '❌ Lỗi AI', description: 'Không thể tạo mô tả.'});
      } finally {
          setIsGeneratingDesc(false);
      }
  }

  const handleISBNScan = async (isbn: string) => {
    setIsLoadingISBN(true);
    try {
      const response = await fetch(`/api/isbn/lookup?isbn=${isbn}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: '📚 Không tìm thấy',
            description: 'Không tìm thấy sách với ISBN này. Bạn có thể nhập thủ công.',
            variant: 'default',
          });
          // Set ISBN and open dialog for manual entry
          setEditingBook({ isbn });
          setIsAddEditOpen(true);
        } else {
          throw new Error(data.error || 'Failed to lookup ISBN');
        }
        return;
      }

      // Populate form with book data
      const book = data.book;
      setEditingBook({
        isbn: book.isbn,
        title: book.title,
        author: book.authors,
        description: book.description,
        genre: book.subjects?.[0] || '',
        publicationYear: book.publicationYear,
        quantity: 1,
        available: 1,
        imageUrl: book.coverImage,
      });

      setIsAddEditOpen(true);

      toast({
        title: '✅ Tìm thấy sách',
        description: `"${book.title}" đã được tìm thấy. Vui lòng kiểm tra và điều chỉnh thông tin.`,
      });
    } catch (error: any) {
      console.error('ISBN lookup error:', error);
      toast({
        variant: 'destructive',
        title: '❌ Lỗi tra cứu ISBN',
        description: error.message || 'Không thể tra cứu thông tin sách.',
      });
    } finally {
      setIsLoadingISBN(false);
    }
  };

  const handleOpenBorrow = (book: Book) => {
    setSelectedBook(book);
    setIsBorrowOpen(true);
  };
  
  const handleOpenQR = (book: Book) => {
    setSelectedBook(book);
    setIsQROpen(true);
  }

  const handleReturnBookByTitle = async (book: Book) => {
    const userWithBook = readers.find(reader => (reader.borrowedBooks ?? []).includes(book.id));
    
    if (!userWithBook) {
  toast({ variant: 'destructive', title: '❌ Trả sách thất bại', description: "Không tìm thấy bạn đọc đang mượn sách này."});
      return;
    }
    
    try {
        const response = await fetch('/api/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: book.id, userId: userWithBook.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

  toast({ title: '✅ Trả sách thành công!', description: data.message});
    } catch (error: unknown) {
         const message = error instanceof Error ? error.message : 'Lỗi không xác định';
         toast({ variant: 'destructive', title: '❌ Trả sách thất bại', description: message});
    }
  };

  const handleQRScan = async (scannedId: string) => {
    setIsLoadingISBN(true);
    try {
      const booksRef = collection(db, 'books');
      const q = query(booksRef, where('libraryId', '==', scannedId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast({
          variant: 'destructive',
          title: '❌ Không tìm thấy',
          description: `Không tìm thấy sách với mã thư viện: ${scannedId}`,
        });
        return;
      }

      const book = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Book;
      
      // Set search term to highlight the book
      setFilters(prev => ({ ...prev, searchTerm: book.libraryId || book.title }));
      
      toast({
        title: '✅ Tìm thấy sách',
        description: `"${book.title}" - ${book.author}`,
      });

      // Scroll to book after a brief delay
      setTimeout(() => {
        const element = document.getElementById(`book-${book.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } catch (error) {
      console.error('QR search error:', error);
      toast({
        variant: 'destructive',
        title: '❌ Lỗi tìm kiếm',
        description: 'Đã xảy ra lỗi khi tìm kiếm sách.',
      });
    } finally {
      setIsLoadingISBN(false);
    }
  };

  const generateNextLibraryId = () => {
    // Find all hexadecimal library IDs
    const hexIds = books
      .map(book => book.libraryId)
      .filter(id => id && /^[0-9A-Fa-f]+$/.test(id)) // Only hex IDs (0-9, A-F)
      .map(id => parseInt(id!, 16)) // Parse as hex to decimal
      .filter(num => !isNaN(num));
    
    // Find max ID and add 1, or start from 1 if no IDs exist
    const maxId = hexIds.length > 0 ? Math.max(...hexIds) : 0;
    const nextId = (maxId + 1).toString(16).toUpperCase().padStart(8, '0'); // Format: 00000001 (hex)
    
    setEditingBook({...editingBook, libraryId: nextId});
    toast({ 
      title: '✅ Mã tự động', 
      description: `Đã tạo mã thư viện: ${nextId}` 
    });
  };


  return (
    <div className="space-y-6">
      {/* Search & Filters Component */}
      <SearchFilters 
        filters={filters}
        onFilterChange={setFilters}
        activeFiltersCount={activeFiltersCount}
        showQRButton={currentUserRole === 'admin' || currentUserRole === 'librarian'}
        onQRScanClick={() => setIsQRScannerOpen(true)}
        availableSeries={availableSeries}
      />

      <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-4 flex-wrap">
            <div className="flex gap-2 flex-shrink-0">
                <div className="flex gap-0 border rounded-md">
                    <Button 
                        onClick={() => setViewMode('card')} 
                        variant={viewMode === 'card' ? 'default' : 'ghost'} 
                        size="sm"
                        className="rounded-r-none border-r"
                    >
                        <LayoutGrid className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Thẻ</span>
                    </Button>
                    <Button 
                        onClick={() => setViewMode('table')} 
                        variant={viewMode === 'table' ? 'default' : 'ghost'} 
                        size="sm"
                        className="rounded-none border-r"
                    >
                        <TableIcon className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Bảng</span>
                    </Button>
                    <Button 
                        onClick={() => setViewMode('series')} 
                        variant={viewMode === 'series' ? 'default' : 'ghost'} 
                        size="sm"
                        className="rounded-l-none"
                    >
                        <BookOpen className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Bộ sách</span>
                    </Button>
                </div>
                <Button onClick={() => setIsRecoDialogOpen(true)} variant="outline" className="w-full sm:w-auto">
                    <Sparkles className="mr-2 h-4 w-4" /> Gợi ý bằng AI
                </Button>
                { (currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                    <>
                      <Button onClick={() => setIsScannerOpen(true)} variant="outline" className="w-full sm:w-auto">
                        <Scan className="mr-2 h-4 w-4" /> Quét ISBN
                      </Button>
                      <Button onClick={handleOpenAdd} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Thêm sách
                      </Button>
                    </>
                )}
            </div>
        </div>

        {viewMode === 'series' ? (
          <SeriesView 
            books={filteredBooks}
            onBookClick={(book) => {
              setSelectedBook(book);
              setIsBorrowOpen(true);
            }}
            userBorrowedBooks={user?.borrowingHistory || []}
          />
        ) : viewMode === 'card' ? (
          <BookCardView 
            books={filteredBooks}
            onBorrowClick={handleOpenBorrow}
            onQRClick={handleOpenQR}
            onEditClick={handleOpenEdit}
            onDeleteClick={(book) => handleDeleteBook(book.id)}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Tác giả</TableHead>
                  <TableHead>Bộ sách</TableHead>
                  <TableHead>Mã thư viện</TableHead>
                  <TableHead>Thể loại</TableHead>
                  <TableHead>Tình trạng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.length > 0 ? filteredBooks.map(book => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>
                      {book.series ? (
                        <Badge variant="default" className="bg-blue-600 text-xs whitespace-nowrap">
                          {book.series}
                          {book.seriesOrder && book.totalInSeries && ` ${book.seriesOrder}/${book.totalInSeries}`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{book.libraryId || 'Không có'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(book.genres || [book.genre]).filter(Boolean).slice(0, 2).map((genre, index) => (
                          <Badge key={`${genre}-${index}`} variant="secondary" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                        {(book.genres?.length || 0) > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(book.genres?.length || 0) - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{book.available} / {book.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={book.status === 'Available' ? 'default' : 'destructive'} className={cn(book.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', 'hover:bg-opacity-80')}>
                        {book.status === 'Available' ? 'Có sẵn' : book.status === 'Borrowed' ? 'Đang mượn' : book.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenBorrow(book)} disabled={book.available === 0}>
                            Mượn
                          </DropdownMenuItem>
                          {(currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                            <DropdownMenuItem onClick={() => handleReturnBookByTitle(book)} disabled={book.available === book.quantity}>
                              Trả
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOpenQR(book)}>
                            <QrCode className="mr-2 h-4 w-4" />
                            Xem mã QR
                          </DropdownMenuItem>
                          { (currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenEdit(book)}>Chỉnh sửa</DropdownMenuItem>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Xóa</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                                          <AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn &quot;{book.title}&quot;. Không thể hoàn tác.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteBook(book.id)}>Tiếp tục</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Không tìm thấy sách nào.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
            
            {/* Mobile View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                {filteredBooks.length > 0 ? filteredBooks.map(book => (
                    <div key={book.id} className="border rounded-lg p-4 flex flex-col space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{book.title}</h3>
                                <p className="text-sm text-muted-foreground">tác giả {book.author}</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Mở menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleOpenBorrow(book)} disabled={book.available === 0}>
                                        Mượn
                                    </DropdownMenuItem>
                                    {(currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                                        <DropdownMenuItem onClick={() => handleReturnBookByTitle(book)} disabled={book.available === book.quantity}>
                                        Trả
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleOpenQR(book)}>
                                        <QrCode className="mr-2 h-4 w-4" />
                                        Xem mã QR
                                    </DropdownMenuItem>
                                    { (currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                                        <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleOpenEdit(book)}>Chỉnh sửa</DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Xóa</DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                                                    <AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn &quot;{book.title}&quot;. Không thể hoàn tác.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteBook(book.id)}>Tiếp tục</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Mã thư viện</span>
                             <Badge variant="outline">{book.libraryId || 'Không có'}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Thể loại</span>
                            <Badge variant="secondary">{book.genre}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tình trạng</span>
                            <span className="font-medium">{book.available} / {book.quantity}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-muted-foreground">Trạng thái</span>
                            <Badge variant={book.status === 'Available' ? 'default' : 'destructive'} className={cn(book.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', 'hover:bg-opacity-80')}>
                                {book.status === 'Available' ? 'Có sẵn' : book.status === 'Borrowed' ? 'Đang mượn' : book.status}
                            </Badge>
                        </div>
                    </div>
                )) : (
                     <div className="col-span-1 sm:col-span-2 h-24 text-center flex items-center justify-center text-muted-foreground">
                        Không tìm thấy sách nào.
                    </div>
                )}
            </div>
          </>
        )}


        {/* Add/Edit Dialog */}
        <Dialog open={isAddEditOpen} onOpenChange={(open) => !open && resetDialogState()}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl flex items-center gap-2">
                {editingBook?.id ? '✏️ Chỉnh sửa sách' : '➕ Thêm sách mới'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {editingBook?.id ? 'Cập nhật thông tin của cuốn sách này.' : 'Điền đầy đủ thông tin để thêm sách vào thư viện.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6 py-4 flex-1 space-y-6">
              {/* Thông tin cơ bản */}
              <div className="space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <span className="text-lg">📖</span>
                  Thông tin cơ bản
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 items-center gap-3">
                    <Label htmlFor="title" className="text-right text-sm font-medium">Tiêu đề <span className="text-red-500">*</span></Label>
                    <Input 
                      id="title" 
                      value={editingBook?.title || ''} 
                      onChange={e => setEditingBook({...editingBook, title: e.target.value})} 
                      className="col-span-3 bg-white dark:bg-gray-950" 
                      placeholder="Nhập tên sách..."
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-3">
                    <Label htmlFor="author" className="text-right text-sm font-medium">Tác giả <span className="text-red-500">*</span></Label>
                    <Input 
                      id="author" 
                      value={editingBook?.author || ''} 
                      onChange={e => setEditingBook({...editingBook, author: e.target.value})} 
                      className="col-span-3 bg-white dark:bg-gray-950"
                      placeholder="Nhập tên tác giả..."
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-3">
                    <Label htmlFor="description" className="text-right pt-2 text-sm font-medium">Mô tả</Label>
                    <div className="col-span-3 space-y-2">
                      <Textarea 
                        id="description" 
                        value={editingBook?.description || ''} 
                        onChange={e => setEditingBook(prev => ({...prev, description: e.target.value }))} 
                        placeholder="Tóm tắt ngắn gọn về cuốn sách..." 
                        rows={3}
                        className="bg-white dark:bg-gray-950 resize-none"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleGenerateDescription} 
                        disabled={isGeneratingDesc || !editingBook?.title || !editingBook?.author}
                        className="w-full sm:w-auto"
                      >
                        {isGeneratingDesc ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                        Tạo mô tả bằng AI
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phân loại & Mã định danh */}
              <div className="space-y-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg border border-purple-100 dark:border-purple-900">
                <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                  <span className="text-lg">🏷️</span>
                  Phân loại & Mã định danh
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 items-center gap-3">
                    <Label htmlFor="libraryId" className="text-right text-sm font-medium">Mã thư viện</Label>
                    <div className="col-span-3 flex gap-2">
                      <Input 
                        id="libraryId" 
                        value={editingBook?.libraryId || ''} 
                        onChange={e => setEditingBook({...editingBook, libraryId: e.target.value})} 
                        placeholder="VD: LIB-001"
                        className="flex-1 bg-white dark:bg-gray-950"
                      />
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={generateNextLibraryId}
                        className="shrink-0"
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Tự động
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-3">
                    <Label className="text-right pt-2 text-sm font-medium">Thể loại <span className="text-red-500">*</span></Label>
                    <div className="col-span-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[36px] p-2 bg-white dark:bg-gray-950 border rounded-md">
                        {editingBook && ((editingBook.genres || [editingBook.genre]).filter((g): g is string => Boolean(g))).map((selectedGenre) => (
                          <Badge key={selectedGenre} variant="secondary" className="gap-1 text-xs">
                            {selectedGenre}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors" 
                              onClick={() => {
                                const currentGenres = (editingBook.genres || [editingBook.genre]).filter((g): g is string => Boolean(g));
                                const newGenres = currentGenres.filter(g => g !== selectedGenre);
                                setEditingBook({
                                  ...editingBook, 
                                  genres: newGenres,
                                  genre: newGenres[0] || ''
                                });
                              }}
                            />
                          </Badge>
                        ))}
                        {(!editingBook || editingBook.genres?.length === 0 || (!editingBook.genres && !editingBook.genre)) && (
                          <span className="text-xs text-muted-foreground italic">Chưa chọn thể loại nào</span>
                        )}
                      </div>
                      <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-1.5 bg-white dark:bg-gray-950">
                        {/* Predefined genres */}
                        {genres.map((genre) => {
                          const currentGenres = editingBook ? (editingBook.genres || [editingBook.genre]).filter((g): g is string => Boolean(g)) : [];
                          const isChecked = currentGenres.includes(genre);
                          return (
                            <div key={genre} className="flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-900 p-1.5 rounded transition-colors">
                              <Checkbox
                                id={`genre-${genre}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const currentGenres = editingBook ? (editingBook.genres || [editingBook.genre]).filter((g): g is string => Boolean(g)) : [];
                                  let newGenres: string[];
                                  if (checked) {
                                    newGenres = [...currentGenres, genre];
                                    // Nếu chọn "Khác", xóa custom genre trước đó
                                    if (genre === 'Khác') {
                                      setCustomGenre("");
                                    }
                                  } else {
                                    newGenres = currentGenres.filter(g => g !== genre);
                                    // Nếu bỏ chọn "Khác", xóa custom genre
                                    if (genre === 'Khác') {
                                      setCustomGenre("");
                                    }
                                  }
                                  setEditingBook({
                                    ...editingBook,
                                    genres: newGenres,
                                    genre: newGenres[0] || ''
                                  });
                                }}
                              />
                              <label
                                htmlFor={`genre-${genre}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                              >
                                {genre}
                              </label>
                            </div>
                          );
                        })}
                        
                        {/* Custom genres from database */}
                        {customGenres.length > 0 && (
                          <>
                            <div className="border-t pt-2 mt-2">
                              <p className="text-xs text-muted-foreground mb-1.5 px-1">Thể loại tùy chỉnh:</p>
                            </div>
                            {customGenres.map((genre) => {
                              const currentGenres = editingBook ? (editingBook.genres || [editingBook.genre]).filter((g): g is string => Boolean(g)) : [];
                              const isChecked = currentGenres.includes(genre);
                              return (
                                <div key={`custom-${genre}`} className="flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-900 p-1.5 rounded transition-colors">
                                  <Checkbox
                                    id={`custom-genre-${genre}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const currentGenres = editingBook ? (editingBook.genres || [editingBook.genre]).filter((g): g is string => Boolean(g)) : [];
                                      let newGenres: string[];
                                      if (checked) {
                                        newGenres = [...currentGenres, genre];
                                      } else {
                                        newGenres = currentGenres.filter(g => g !== genre);
                                      }
                                      setEditingBook({
                                        ...editingBook,
                                        genres: newGenres,
                                        genre: newGenres[0] || ''
                                      });
                                    }}
                                  />
                                  <label
                                    htmlFor={`custom-genre-${genre}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                  >
                                    {genre} <span className="text-xs text-purple-500">✨</span>
                                  </label>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                      {/* Hiện ô nhập custom genre khi chọn "Khác" */}
                      {editingBook && (editingBook.genres || [editingBook.genre]).filter(Boolean).includes('Khác') && (
                        <div className="space-y-2">
                          <Label htmlFor="customGenre" className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            Thể loại tùy chỉnh
                          </Label>
                          <Input 
                            id="customGenre" 
                            placeholder="Nhập thể loại mới (ngăn cách bằng dấu phẩy nếu nhiều)" 
                            value={customGenre} 
                            onChange={e => setCustomGenre(e.target.value)} 
                            className="bg-white dark:bg-gray-950 border-purple-200 dark:border-purple-800 focus:border-purple-400"
                          />
                          <p className="text-xs text-muted-foreground">
                            💡 Ví dụ: Triết học, Khoa học tự nhiên, Nấu ăn
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-3">
                    <Label htmlFor="isbn" className="text-right text-sm font-medium">ISBN</Label>
                    <Input 
                      id="isbn" 
                      placeholder="978-xxx-xxx-xxx-x" 
                      value={editingBook?.isbn || ''} 
                      onChange={e => setEditingBook({...editingBook, isbn: e.target.value})} 
                      className="col-span-3 bg-white dark:bg-gray-950" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-3">
                    <Label htmlFor="publicationYear" className="text-right text-sm font-medium">Năm XB</Label>
                    <Input 
                      id="publicationYear" 
                      type="number" 
                      placeholder="2025" 
                      min="1900"
                      max={new Date().getFullYear()}
                      value={editingBook?.publicationYear || ''} 
                      onChange={e => setEditingBook({...editingBook, publicationYear: e.target.value ? Number(e.target.value) : undefined})} 
                      className="col-span-3 bg-white dark:bg-gray-950" 
                    />
                  </div>
                </div>
              </div>
              
              {/* Series Management */}
              <div className="space-y-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg border border-green-100 dark:border-green-900">
                <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                  <span className="text-lg">📚</span>
                  Quản lý bộ sách
                  <Badge variant="outline" className="text-xs ml-auto">Tùy chọn</Badge>
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 items-center gap-3">
                    <Label htmlFor="series" className="text-right text-sm font-medium">Tên bộ sách</Label>
                    <Input 
                      id="series" 
                      placeholder="Ví dụ: Harry Potter" 
                      value={editingBook?.series || ''} 
                      onChange={e => setEditingBook({...editingBook, series: e.target.value})} 
                      className="col-span-3 bg-white dark:bg-gray-950" 
                      list="series-suggestions"
                    />
                    <datalist id="series-suggestions">
                      {Array.from(new Set(books.map(b => b.series).filter(Boolean))).map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  {editingBook?.series && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="seriesOrder" className="text-sm font-medium whitespace-nowrap">Tập thứ:</Label>
                          <Input 
                            id="seriesOrder" 
                            type="number" 
                            min="1"
                            placeholder="1" 
                            value={editingBook?.seriesOrder || ''} 
                            onChange={e => setEditingBook({...editingBook, seriesOrder: e.target.value ? Number(e.target.value) : undefined})} 
                            className="flex-1 bg-white dark:bg-gray-950" 
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="totalInSeries" className="text-sm font-medium whitespace-nowrap">Tổng số:</Label>
                          <Input 
                            id="totalInSeries" 
                            type="number" 
                            min="1"
                            placeholder="7" 
                            value={editingBook?.totalInSeries || ''} 
                            onChange={e => setEditingBook({...editingBook, totalInSeries: e.target.value ? Number(e.target.value) : undefined})} 
                            className="flex-1 bg-white dark:bg-gray-950" 
                          />
                        </div>
                      </div>
                      {editingBook.seriesOrder && editingBook.totalInSeries && (
                        <div className="text-sm font-medium text-center bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-900 dark:text-blue-100 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                          📖 Tập <span className="font-bold text-lg">{editingBook.seriesOrder}</span>/{editingBook.totalInSeries} của bộ "<span className="font-semibold">{editingBook.series}</span>"
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Quản lý số lượng & Giá */}
              <div className="space-y-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 rounded-lg border border-orange-100 dark:border-orange-900">
                <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  Số lượng & Phí
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm font-medium">Số lượng sách</Label>
                      <Input 
                        id="quantity" 
                        type="number" 
                        min="1" 
                        value={editingBook?.quantity || 1} 
                        onChange={e => setEditingBook({...editingBook, quantity: Number(e.target.value)})} 
                        className="bg-white dark:bg-gray-950" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lateFee" className="text-sm font-medium flex items-center gap-2">
                        Phí trễ/ngày (VNĐ)
                        {(currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                          <Badge variant="secondary" className="text-xs">Chỉnh sửa được</Badge>
                        )}
                      </Label>
                      <Input 
                        id="lateFee" 
                        type="number" 
                        min="0" 
                        placeholder="Mặc định: 5,000 VNĐ/ngày"
                        value={editingBook?.lateFeePerDay || 0} 
                        onChange={e => setEditingBook({...editingBook, lateFeePerDay: Number(e.target.value)})} 
                        className="bg-white dark:bg-gray-950" 
                        disabled={currentUserRole !== 'admin' && currentUserRole !== 'librarian'} 
                      />
                      {(currentUserRole !== 'admin' && currentUserRole !== 'librarian') && (
                        <p className="text-xs text-muted-foreground">
                          🔒 Chỉ admin/thủ thư mới có thể chỉnh sửa phí trễ
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ảnh bìa */}
              <div className="space-y-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 p-4 rounded-lg border border-pink-100 dark:border-pink-900">
                <h4 className="text-sm font-semibold text-pink-900 dark:text-pink-100 flex items-center gap-2">
                  <span className="text-lg">🖼️</span>
                  Ảnh bìa sách
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl" className="text-sm font-medium">URL hình ảnh</Label>
                    <Input 
                      id="imageUrl" 
                      value={editingBook?.imageUrl || ''} 
                      onChange={e => setEditingBook({...editingBook, imageUrl: e.target.value})} 
                      placeholder="https://example.com/book-cover.jpg" 
                      className="bg-white dark:bg-gray-950"
                    />
                  </div>
                  {editingBook?.imageUrl && (
                    <div className="relative w-full aspect-[3/4] max-w-xs mx-auto rounded-lg border-2 border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-950 overflow-hidden shadow-lg">
                      <Image 
                        src={editingBook.imageUrl} 
                        alt="Xem trước ảnh bìa" 
                        fill 
                        className="object-contain" 
                        sizes="(max-width: 768px) 100vw, 384px" 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900/50">
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetDialogState}
                className="min-w-[100px]"
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                onClick={handleSaveBook}
                className="min-w-[100px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {editingBook?.id ? '💾 Cập nhật' : '➕ Thêm sách'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedBook && (
            <BorrowDialog 
                book={selectedBook}
                readers={readers}
                isOpen={isBorrowOpen}
                setIsOpen={setIsBorrowOpen}
            />
        )}

        {selectedBook && (
            <QRCodeDialog
                book={selectedBook}
                isOpen={isQROpen}
                setIsOpen={setIsQROpen}
            />
        )}

        <PersonalizedRecommendationsDialog
            readers={enrichedReaders}
            isOpen={isRecoDialogOpen}
            setIsOpen={setIsRecoDialogOpen}
        />

        <BarcodeScanner
          open={isScannerOpen}
          onOpenChange={setIsScannerOpen}
          onScanSuccess={handleISBNScan}
          mode="isbn"
          title="Quét mã vạch ISBN"
          description="Hướng camera vào mã vạch trên sách để tự động điền thông tin"
        />

        <BarcodeScanner
          open={isQRScannerOpen}
          onOpenChange={setIsQRScannerOpen}
          onScanSuccess={handleQRScan}
          mode="library-id"
          title="Quét QR Code Thư viện"
          description="Hướng camera vào QR code trên nhãn sách"
        />

      </CardContent>
    </Card>
    </div>
  );
}

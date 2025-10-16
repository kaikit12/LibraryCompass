"use client";

import { useState, useEffect } from "react";
import { Book, Reader } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Eye, QrCode, MoreHorizontal, ChevronLeft, ChevronRight, Star, Heart } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ReserveButton } from "./reserve-button";
import { BookAppointmentDialog } from "./book-appointment-dialog";
import { ReviewDialog } from "./review-dialog";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookCardViewProps {
  books: Book[];
  onBorrowClick: (book: Book) => void;
  onQRClick: (book: Book) => void;
  onEditClick: (book: Book) => void;
  onDeleteClick: (book: Book) => void;
}

const BOOKS_PER_PAGE = 20; // 4 columns × 5 rows

export function BookCardView({
  books,
  onBorrowClick,
  onQRClick,
  onEditClick,
  onDeleteClick,
}: BookCardViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentUserRole = user?.role;
  const isReader = currentUserRole === "reader";
  const canEdit = currentUserRole === "admin" || currentUserRole === "librarian";

  const [currentPage, setCurrentPage] = useState(1);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBookForReview, setSelectedBookForReview] = useState<Book | null>(null);
  const [addingToWishlist, setAddingToWishlist] = useState<string | null>(null);
  const [wishlistBookIds, setWishlistBookIds] = useState<Set<string>>(new Set());
  
  // Fetch user's wishlist to track which books are already saved
  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/wishlist?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          const bookIds = new Set<string>(data.wishlist.map((item: any) => item.bookId as string));
          setWishlistBookIds(bookIds);
        }
      } catch (error) {
        console.error('Error fetching wishlist:', error);
      }
    };

    fetchWishlist();
  }, [user?.id]);
  
  // Calculate pagination
  const totalPages = Math.ceil(books.length / BOOKS_PER_PAGE);
  const startIndex = (currentPage - 1) * BOOKS_PER_PAGE;
  const endIndex = startIndex + BOOKS_PER_PAGE;
  const currentBooks = books.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusBadge = (book: Book) => {
    if (book.status === "Available" || book.available > 0) {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">Có sẵn</Badge>;
    }
    return <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-0">Đang mượn</Badge>;
  };

  const getConditionBadge = (book: Book) => {
    const condition = book.condition || 'good';
    
    if (condition === 'good') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-0">
          <span className="mr-1 text-green-500">●</span>
          Tốt
        </Badge>
      );
    }
    
    if (condition === 'damaged') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0">
          <span className="mr-1 text-yellow-500">●</span>
          Hư hỏng
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-0">
        <span className="mr-1 text-red-500">●</span>
        Mất
      </Badge>
    );
  };

  const handleAddToWishlist = async (book: Book) => {
    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng đăng nhập để thêm vào danh sách đọc',
        variant: 'destructive',
      });
      return;
    }

    setAddingToWishlist(book.id);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          bookId: book.id,
          priority: 'medium',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add to wishlist');
      }

      // Update local state to reflect the addition
      setWishlistBookIds(prev => new Set([...prev, book.id]));

      toast({
        title: '❤️ Đã thêm vào danh sách đọc',
        description: `"${book.title}" đã được lưu`,
      });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể thêm vào danh sách đọc',
        variant: 'destructive',
      });
    } finally {
      setAddingToWishlist(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentBooks.map((book) => {
          const isBorrowable = book.available > 0;
          const userHasBorrowed = user?.borrowedBooks?.includes(book.id);

          return (
            <Card 
              key={book.id} 
              id={`book-${book.id}`}
              className="group overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col border-2 hover:border-primary/20"
            >
              <CardHeader className="p-0 relative">
                <Link href={`/books/${book.id}`} className="block aspect-[2/3] relative bg-gradient-to-br from-primary/5 to-accent/5">
                  {book.imageUrl ? (
                    <Image
                      src={book.imageUrl}
                      alt={`Ảnh bìa ${book.title}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5">
                      <BookOpen className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {getStatusBadge(book)}
                    {getConditionBadge(book)}
                  </div>
                </Link>
              </CardHeader>

              <CardContent className="flex-1 p-4">
                <Link href={`/books/${book.id}`} className="block group">
                  <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {book.author}
                  </p>
                </Link>

                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Series Badge */}
                  {book.series && (
                    <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-700">
                      📚 {book.series}
                      {book.seriesOrder && book.totalInSeries && ` (${book.seriesOrder}/${book.totalInSeries})`}
                    </Badge>
                  )}
                  
                  {/* Genres */}
                  {(book.genres || [book.genre]).filter(Boolean).map((genre, index) => (
                    <Badge 
                      key={`${genre}-${index}`} 
                      variant="secondary" 
                      className="text-xs bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {genre}
                    </Badge>
                  ))}
                  
                  {/* Library ID */}
                  {book.libraryId && (
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary/80">
                      {book.libraryId}
                    </Badge>
                  )}
                </div>

                {/* Rating Display - Only show when there are reviews */}
                {book.rating && book.rating > 0 && book.reviewCount && book.reviewCount > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{book.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">
                      ({book.reviewCount})
                    </span>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Còn: <span className="font-semibold text-primary">{book.available}/{book.quantity}</span>
                  </span>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0 gap-2 flex-wrap">
                {/* Admin/Librarian: Can borrow directly */}
                {canEdit && isBorrowable && (
                  <Button
                    size="sm"
                    className="flex-1 gradient-primary border-0"
                    onClick={() => onBorrowClick(book)}
                    disabled={userHasBorrowed}
                    variant={userHasBorrowed ? "outline" : "default"}
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    {userHasBorrowed ? "Đã mượn" : "Mượn (Admin)"}
                  </Button>
                )}

                {/* Reader: Can only book appointment when book is available */}
                {isReader && isBorrowable && !userHasBorrowed && (
                  <BookAppointmentDialog
                    bookId={book.id}
                    bookTitle={book.title}
                    disabled={userHasBorrowed}
                  />
                )}

                {/* Reader borrowed status */}
                {isReader && userHasBorrowed && (
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled
                    variant="outline"
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    Đã mượn
                  </Button>
                )}

                {/* Reserve button - shown only for readers when book is not available */}
                {!isBorrowable && !canEdit && (
                  <ReserveButton
                    bookId={book.id}
                    bookTitle={book.title}
                    isAvailable={isBorrowable}
                    className="flex-1"
                  />
                )}

                <Link href={`/books/${book.id}`}>
                  <Button size="sm" variant="outline" className="border-primary/30 hover:bg-primary/10 hover:text-primary">
                    <Eye className="h-4 w-4 mr-1" />
                    Chi tiết
                  </Button>
                </Link>

                {/* Review Button - For everyone */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedBookForReview(book);
                    setReviewDialogOpen(true);
                  }}
                  className="border-yellow-400/30 hover:bg-yellow-50 hover:text-yellow-700"
                >
                  <Star className="h-4 w-4 mr-1" />
                  Đánh giá
                </Button>

                {/* Wishlist Button - For readers */}
                {isReader && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToWishlist(book)}
                    disabled={addingToWishlist === book.id || wishlistBookIds.has(book.id)}
                    className="border-pink-400/30 hover:bg-pink-50 hover:text-pink-700 disabled:opacity-50"
                  >
                    <Heart className={`h-4 w-4 mr-1 ${wishlistBookIds.has(book.id) ? 'fill-pink-500 text-pink-500' : ''}`} />
                    {addingToWishlist === book.id ? 'Đang lưu...' : wishlistBookIds.has(book.id) ? 'Đã lưu' : 'Lưu'}
                  </Button>
                )}

                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="px-2 border-primary/30 hover:bg-primary/10">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onQRClick(book)}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Mã QR
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditClick(book)}>
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteClick(book)}
                        className="text-destructive"
                      >
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Trước
          </Button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = 
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1);
              
              const showEllipsis = 
                (page === currentPage - 2 && currentPage > 3) ||
                (page === currentPage + 2 && currentPage < totalPages - 2);

              if (showEllipsis) {
                return <span key={page} className="px-2 py-1">...</span>;
              }

              if (!showPage) {
                return null;
              }

              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className="min-w-[2.5rem]"
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Sau
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Page Info */}
      {books.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Hiển thị {startIndex + 1}-{Math.min(endIndex, books.length)} trong tổng số {books.length} sách
        </p>
      )}

      {/* Review Dialog */}
      {selectedBookForReview && (
        <ReviewDialog
          bookId={selectedBookForReview.id}
          bookTitle={selectedBookForReview.title}
          isOpen={reviewDialogOpen}
          setIsOpen={setReviewDialogOpen}
        />
      )}
    </div>
  );
}

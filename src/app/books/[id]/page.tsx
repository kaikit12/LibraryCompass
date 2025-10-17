
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Book, Reader, FirebaseDocumentSnapshot } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, collection, Unsubscribe, DocumentSnapshot } from "firebase/firestore";
import { safeOnSnapshot } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCopy, CheckCircle, XCircle, ArrowLeft, Users, BookmarkPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BorrowDialog } from "@/components/books/borrow-dialog";
import { ReserveButton } from "@/components/books/reserve-button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  const { toast } = useToast();
  const { user: currentUser } = useAuth();


  const [book, setBook] = useState<Book | null>(null);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(true);

  const [isBorrowOpen, setIsBorrowOpen] = useState(false);
  
  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    const bookRef = doc(db, "books", bookId);
    const unsubscribeBook = safeOnSnapshot(bookRef, (docSnapshot) => {
      const snapshot = docSnapshot as DocumentSnapshot;
      if (snapshot.exists()) {
        setBook({ id: snapshot.id, ...snapshot.data() } as Book);
      } else {
        setBook(null);
      }
      setLoading(false);
    }, (err) => {
      toast({ title: 'Lỗi tải sách', description: String(err) });
      setLoading(false);
    });

    let unsubscribeReaders: Unsubscribe | undefined;

    // Only fetch readers if a user is logged in
    if (currentUser) {
    if (currentUser.role === 'admin' || currentUser.role === 'librarian') {
      unsubscribeReaders = safeOnSnapshot(collection(db, "users"), (snapshot) => {
        const querySnapshot = snapshot as any;
        const liveReaders = (querySnapshot.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as Reader));
        setReaders(liveReaders);
      }, (err) => {
        toast({ title: 'Lỗi tải người dùng', description: String(err) });
      });
        } else {
            // If the user is a reader, they don't need the full list.
            // We just create a list containing only them to pass to the borrow dialog.
            setReaders([currentUser]);
        }
    }


    return () => {
        unsubscribeBook();
        if (unsubscribeReaders) {
            unsubscribeReaders();
        }
    };
  }, [bookId, currentUser]);
  
  const handleBorrowClick = () => {
    if (!currentUser) {
      router.push('/login');
    } else {
      setIsBorrowOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!book) {
    return (
        <div className="text-center">
      <h1 className="text-2xl font-bold">Không tìm thấy sách</h1>
      <p className="text-muted-foreground">Cuốn sách bạn tìm không tồn tại.</p>
            <Button asChild className="mt-4">
        <Link href="/books"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại Kho sách</Link>
            </Button>
        </div>
    );
  }

  const isBorrowable = book.status === 'Available' && book.available > 0;
  const isAdminOrLibrarian = currentUser && (currentUser.role === 'admin' || currentUser.role === 'librarian');
  const isReader = currentUser && currentUser.role === 'reader';

  return (
    <div className="max-w-4xl mx-auto">
        <div className="mb-6">
            <Button asChild variant="outline" size="sm">
        <Link href="/books">
                    <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại tất cả sách
                </Link>
            </Button>
        </div>

      <Card>
        {book.imageUrl && (
            <div className="relative h-96 w-full overflow-hidden rounded-t-lg">
        <Image
          src={book.imageUrl}
          alt={`Ảnh bìa ${book.title}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1024px"
          priority
        />
            </div>
        )}
        <CardHeader className={!book.imageUrl ? '' : 'pt-6'}>
          <CardTitle className="font-headline text-3xl">{book.title}</CardTitle>
          <CardDescription>Tác giả {book.author}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Thông tin cơ bản */}
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  {/* Thể loại */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-lg">{book.genre}</Badge>
                    {book.libraryId && <Badge variant="outline" className="text-md">ID: {book.libraryId}</Badge>}
                  </div>
                  
                  {/* Series info */}
                  {book.series && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                        📚 {book.series} {book.seriesOrder && book.totalInSeries && `(${book.seriesOrder}/${book.totalInSeries})`}
                      </Badge>
                    </div>
                  )}
                  
                  {/* ISBN */}
                  {book.isbn && (
                    <p className="text-sm text-muted-foreground">
                      ISBN: {book.isbn}
                    </p>
                  )}
                  
                  {/* Số lượng đặt trước */}
                  {book.reservationCount && book.reservationCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-blue-500 text-white">
                        {book.reservationCount} người đang đặt trước
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Số lượng sách */}
                <div className="text-right shrink-0">
                    <div className="font-bold text-2xl text-primary">{book.available}</div>
                    <div className="text-sm text-muted-foreground">Còn lại</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Tổng: {book.quantity}
                    </div>
                </div>
            </div>

            {book.description && (
                <p className="text-muted-foreground italic border-l-4 pl-4">{book.description}</p>
            )}

            <div className="flex items-center gap-2">
                { isBorrowable ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" /> }
        <span className={`font-medium ${isBorrowable ? 'text-foreground' : 'text-muted-foreground'}`}>
           Trạng thái: {book.status === 'Available' ? 'Có sẵn' : book.status === 'Borrowed' ? 'Đang mượn' : book.status}
                </span>
            </div>
            
            <div className="pt-4 border-t">
              {/* Admin/Librarian: Nút Mượn */}
              {isAdminOrLibrarian && (
                <Button onClick={handleBorrowClick} disabled={!isBorrowable} className="w-full" size="lg">
                  <BookCopy className="mr-2" /> Mượn sách cho bạn đọc
                </Button>
              )}
              
              {/* Reader: Nút Đặt sách */}
              {isReader && (
                <div className="space-y-3">
                  <ReserveButton 
                    bookId={book.id} 
                    bookTitle={book.title}
                    isAvailable={isBorrowable}
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    💡 Đặt trước để được ưu tiên khi sách có sẵn
                  </p>
                </div>
              )}
              
              {/* Chưa đăng nhập */}
              {!currentUser && (
                <Button onClick={handleBorrowClick} disabled={!isBorrowable} className="w-full" size="lg">
                  <BookCopy className="mr-2" /> 
                  Đăng nhập để mượn/đặt sách
                </Button>
              )}
            </div>
        </CardContent>
      </Card>

      {/* The BorrowDialog is only mounted if there is a logged-in user, as it requires user context */}
      {currentUser && (
        <BorrowDialog
            book={book}
            readers={readers}
            isOpen={isBorrowOpen}
            setIsOpen={setIsBorrowOpen}
        />
      )}
    </div>
  );
}


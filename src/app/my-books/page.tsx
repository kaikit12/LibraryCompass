"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, safeOnSnapshot } from '@/lib/firebase';
import { collection, query, where, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { Book, Reader } from '@/lib/types';
import { groqChat } from '@/app/actions/groq-chat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BookOpen, Sparkles, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { PageHeader } from '@/components/layout/page-header';
import { UserIdCard } from '@/components/readers/user-id-card';
import { MyReservations } from '@/components/books/my-reservations';
import { MyAppointments } from '@/components/books/my-appointments';
import { MyWishlist } from '@/components/books/my-wishlist';
import { ReaderStats } from '@/components/readers/reader-stats';
import { RenewButton } from '@/components/books/renew-button';

interface Borrowal {
    id: string;
    bookId: string;
    userId: string;
    dueDate: Date;
}

interface BorrowedBookView extends Book {
    dueDate: string;
    dueDateObj: Date;
    borrowalId: string;
}

export default function MyBooksPage() {
    const { user } = useAuth();
    const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBookView[]>([]);
    const [recommendations, setRecommendations] = useState<string[] | null>(null);
    const [allBooks, setAllBooks] = useState<Book[]>([]);
    const [activeBorrowals, setActiveBorrowals] = useState<Borrowal[]>([]);
    const [history, setHistory] = useState<any[]>([]); // [{title, author, returnedAt, dueDate, status}]
    const [isLoading, setIsLoading] = useState(true);
    const [isRecoLoading, setIsRecoLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Listener for all books
    useEffect(() => {
        if (!db) return;
        const booksQuery = collection(db, 'books');
        const unsubscribe = safeOnSnapshot(booksQuery, (snapshot: any) => {
            const books = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Book));
            setAllBooks(books);
        });
        return () => unsubscribe();
    }, []);

    // Listener for user's active borrowals
    useEffect(() => {
        if (!user || !db) return;
        setIsLoading(true);
        const borrowalsQuery = query(collection(db, 'borrowals'), where('userId', '==', user.id), where('status', '==', 'borrowed'));
        const unsubscribe = safeOnSnapshot(borrowalsQuery, (snapshot: any) => {
            const borrowals = snapshot.docs.map((d: any) => ({
                id: d.id,
                bookId: d.data().bookId,
                userId: d.data().userId,
                dueDate: d.data().dueDate.toDate(),
            } as Borrowal));
            setActiveBorrowals(borrowals);
            setIsLoading(false);
        }, () => {
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Combine data into view model
    useEffect(() => {
        if (activeBorrowals.length === 0 && allBooks.length > 0) {
            setBorrowedBooks([]);
            return;
        }

        const booksMap = new Map(allBooks.map(b => [b.id, b]));
        const borrowedBookDetails = activeBorrowals
            .map(borrowal => {
                const book = booksMap.get(borrowal.bookId);
                if (book) {
                    return {
                        ...book,
                        dueDate: format(borrowal.dueDate, 'PPP', { locale: vi }),
                        dueDateObj: borrowal.dueDate,
                        borrowalId: borrowal.id,
                    };
                }
                return null;
            })
            .filter((b): b is BorrowedBookView => b !== null);

        setBorrowedBooks(borrowedBookDetails);
    }, [activeBorrowals, allBooks]);

    // Lấy lịch sử mượn/trả (status: returned)
    useEffect(() => {
        if (!user || !db) return;
        const qHistory = query(collection(db, 'borrowals'), where('userId', '==', user.id), where('status', '==', 'returned'));
        const unsub = safeOnSnapshot(qHistory, async (snapshot: any) => {
            const booksMap = new Map(allBooks.map(b => [b.id, b]));
            const items = await Promise.all(snapshot.docs.map(async (d: any) => {
                const data = d.data();
                let book = booksMap.get(data.bookId);
                if (!book) {
                    const bookDoc = await getDoc(doc(db, 'books', data.bookId));
                    book = bookDoc.exists() ? { id: bookDoc.id, ...bookDoc.data() } as Book : undefined;
                }
                return book ? {
                    id: d.id, // Borrowal ID
                    title: book.title,
                    author: book.author,
                    borrowedAt: data.borrowedAt?.toDate?.() || null,
                    returnedAt: data.returnedAt?.toDate?.() || null,
                    dueDate: data.dueDate?.toDate?.() || null,
                    status: (data.returnedAt && data.dueDate && data.returnedAt.toDate() > data.dueDate.toDate()) ? 'Trả trễ' : 'Đúng hạn',
                } : null;
            }));
            setHistory(items.filter(Boolean));
        });
        return () => unsub();
    }, [user, allBooks]);

    const generateRecommendations = useCallback(async () => {
        if (!user || !db) return;
        setIsRecoLoading(true);
        setRecommendations(null);

        try {
            const userDocRef = doc(db, 'users', user.id);
            const userSnapshot = await getDoc(userDocRef);

            if (!userSnapshot.exists()) {
                throw new Error("User data not found.");
            }
            const readerData = userSnapshot.data() as Reader;

            // Firestore 'in' query is limited to 30 elements.
            const historyIds = [...new Set([...(readerData.borrowingHistory || []), ...(readerData.borrowedBooks || [])])].slice(0, 30);
            
            let historyTitles: string[] = [];
            if (historyIds.length > 0) {
                const historyBooksQuery = query(collection(db, 'books'), where('__name__', 'in', historyIds));
                const historyBooksSnapshot = await getDocs(historyBooksQuery);
                historyTitles = historyBooksSnapshot.docs.map(doc => doc.data().title);
            }

            const prompt = `Dựa trên lịch sử đọc sau: ${historyTitles.join(', ')}. HÃY TRẢ VỀ DUY NHẤT MỘT MẢNG JSON CÁC TIÊU ĐỀ SÁCH (array of strings) KHÔNG KÈM BẤT KỲ CHỮ NÀO KHÁC. Ví dụ: ["Sapiens: Lược sử loài người", "Nhà giả kim", "Cảm xúc nhân tạo"]. Không kèm mô tả, ký tự gạch đầu dòng hay chú thích.`;
            let result;
            try {
                result = await groqChat({ prompt });
            } catch (err) {
                throw new Error('Không thể kết nối AI, vui lòng thử lại sau.');
            }

            // Try to extract JSON array from the model response first
            let recoList: string[] = [];
            try {
                const raw = String(result?.content || '');
                const jsonMatch = raw.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        recoList = parsed.map((s: unknown) => String(s).trim()).filter(Boolean);
                    }
                }
            } catch (e) {
                // fall through to fallback parsing
            }

            // Fallback: robust cleaning if JSON parse failed or returned empty
            if (!recoList.length) {
                const raw = String(result?.content || '');
                // Try a rescue: ask the model one more time to extract titles as a JSON array from its previous output.
                try {
                    const rescuePrompt = `Trích xuất danh sách tiêu đề sách từ văn bản sau và trả về DUY NHẤT một mảng JSON các chuỗi. Văn bản: """${raw}"""`;
                    const rescueResp = await groqChat({ prompt: rescuePrompt });
                    const rescueRaw = String(rescueResp?.content || '');
                    const rescueMatch = rescueRaw.match(/\[[\s\S]*\]/);
                    if (rescueMatch) {
                        const parsedRescue = JSON.parse(rescueMatch[0]);
                        if (Array.isArray(parsedRescue)) {
                            recoList = parsedRescue.map((s: unknown) => String(s).trim()).filter(Boolean);
                        }
                    }
                } catch (retryErr) {
                    // ignore and use regex fallback below
                }

                // If rescue didn't produce results, fallback to robust regex cleaning
                if (!recoList.length) {
                    recoList = raw
                    .split(/\n|•|\*|\r/) // split on common bullets/newlines
                    .map(item => {
                        let cleaned = item
                            .replace(/^[-\d.\s]*["'""']?/, '') // remove bullets, numbering, opening quotes
                            .replace(/["'""'\s]*$/, '') // trim trailing quotes/spaces
                            .replace(/^sách\s*/i, '') // remove leading 'sách' if present
                            .replace(/\s*\([^\)]*\)\s*/g, ' ') // remove parenthetical genres
                            .replace(/[_=+*~`<>\/]+/g, ' '); // remove weird punct chars
                        
                        // Tách author-title nếu có dấu gạch ngang (Author-Title)
                        cleaned = cleaned.replace(/^([^-]+)-(.+)$/, '$2'); // chỉ lấy phần title sau dấu gạch ngang
                        
                        // Tách concatenated words: thêm space trước chữ hoa và sau chữ thường
                        cleaned = cleaned
                            .replace(/([a-zà-ỹ])([A-ZÀ-Ỹ])/g, '$1 $2') // lowercase -> Uppercase
                            .replace(/([A-ZÀ-Ỹ])([A-ZÀ-Ỹ][a-zà-ỹ])/g, '$1 $2') // ABc -> A Bc
                            .replace(/([0-9])([A-ZÀ-Ỹa-zà-ỹ])/g, '$1 $2') // số + chữ
                            .replace(/([A-ZÀ-Ỹa-zà-ỹ])([0-9])/g, '$1 $2') // chữ + số
                            .replace(/\s+/g, ' ') // chuẩn hóa khoảng trắng
                            .trim();
                        
                        return cleaned;
                    })
                    .filter(Boolean);
                }
            }

            // Final sanitize: ensure reasonable length and wrap long strings (UI handles wrapping, but we cap long words)
            recoList = recoList.map(s => {
                // truncate extremely long single-word sequences by inserting spaces every 20 chars
                return s.replace(/(\S{20})(?=\S)/g, '$1 ');
            }).filter(Boolean);

            setRecommendations(recoList);

        } catch (e: unknown) {
            setRecommendations([]);
            // Có thể log lỗi nếu cần: console.error(e);
        } finally {
            setIsRecoLoading(false);
        }
    }, [user]);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
    }

    // Hàm reset phí trễ hạn
    const handleResetLateFees = async () => {
        if (!user) return;
        setIsResetting(true);
        try {
            await updateDoc(doc(db, 'users', user.id), { lateFees: 0 });
        } finally {
            setIsResetting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }
    
    if (!user) {
         return (
             <div className="text-center">
                <h1 className="text-2xl font-bold">Vui lòng đăng nhập</h1>
                <p className="text-muted-foreground">Bạn cần đăng nhập để xem sách của mình.</p>
             </div>
         )
    }

    return (
        <div className="space-y-8">
            <PageHeader 
                title="Sách của tôi" 
                description={`Chào mừng trở lại, ${user.name}! Đây là tổng quan hoạt động thư viện của bạn.`}
            />

            {/* User ID Card with Barcode */}
            <UserIdCard />

            {/* Reading Statistics */}
            <ReaderStats />

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign />Phí trễ hạn</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(user.lateFees || 0)}</p>
                    <p className="text-sm text-muted-foreground">Vui lòng thanh toán các khoản phí còn nợ tại quầy thư viện.</p>
                    {(user.role === 'admin' || user.role === 'librarian') && ((user.lateFees || 0) > 0) && (
                        <Button onClick={handleResetLateFees} disabled={isResetting} className="mt-2 gradient-primary text-white">
                            {isResetting ? 'Đang xử lý...' : 'Đã thanh toán phí trễ hạn'}
                        </Button>
                    )}
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookOpen />Đang mượn</CardTitle>
                        <CardDescription>Các sách bạn đang mượn.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {borrowedBooks.length > 0 ? (
                            <div className="space-y-4">
                                {borrowedBooks.map(book => {
                                    const isOverdue = new Date(book.dueDate) < new Date();
                                    return (
                                        <div key={book.id} className="flex flex-col gap-3 p-4 rounded-lg bg-secondary">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-semibold">{book.title}</p>
                                                    <p className="text-sm text-muted-foreground">bởi {book.author}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">Hạn trả: {book.dueDate}</p>
                                                    <Badge variant={isOverdue ? 'destructive' : 'outline'}>
                                                        {isOverdue ? 'Quá hạn' : 'Đang mượn'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {!isOverdue && (
                                                <div className="flex justify-end">
                                                    <RenewButton
                                                        borrowalId={book.borrowalId}
                                                        bookId={book.id}
                                                        bookTitle={book.title}
                                                        userId={user.id}
                                                        userName={user.name}
                                                        currentDueDate={book.dueDateObj}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Bạn chưa mượn sách nào. <Button variant="link" asChild><Link href="/books">Duyệt sách</Link></Button></p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sparkles />Gợi ý AI</CardTitle>
                        <CardDescription>Sách bạn có thể thích dựa trên lịch sử đọc.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center min-h-[200px] max-w-full break-words whitespace-pre-line">
                        {isRecoLoading ? (
                             <div className="text-center text-muted-foreground">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                <p className="mt-2">Đang suy nghĩ về những cuốn sách tuyệt vời cho bạn...</p>
                            </div>
                        ): recommendations ? (
                            recommendations.length > 0 ? (
                                <ul className="space-y-2 list-disc list-inside w-full break-words whitespace-normal">
                                    {recommendations.map((rec, i) => (
                                        <li key={i} className="break-words break-all max-w-full">{rec}</li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center">
                                    <p className="text-muted-foreground mb-4">Không thể tạo gợi ý lúc này. Vui lòng thử lại sau.</p>
                                    <Button onClick={generateRecommendations}>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Thử lại
                                    </Button>
                                </div>
                            )
                        ) : (
                            <div className="text-center">
                                <p className="text-muted-foreground mb-4">Nhấn nút để nhận gợi ý sách mới!</p>
                                <Button onClick={generateRecommendations}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Tạo gợi ý cho tôi
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* My Appointments Section */}
            <MyAppointments />

            {/* My Wishlist Section */}
            <MyWishlist />

            {/* My Reservations Section */}
            <MyReservations userId={user.id} />

            {/* Timeline lịch sử mượn/trả */}
            <Card>
                <CardHeader>
                    <CardTitle>Lịch sử mượn/trả</CardTitle>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <p className="text-muted-foreground">Bạn chưa có lịch sử mượn/trả sách.</p>
                    ) : (
                        <Timeline>
                            {history.slice().sort((a, b) => (b.returnedAt?.getTime?.()||0)-(a.returnedAt?.getTime?.()||0)).map((item) => (
                                <TimelineItem
                                    key={item.id}
                                    title={item.title}
                                    description={`bởi ${item.author}`}
                                    time={item.borrowedAt && item.returnedAt 
                                        ? `Mượn: ${format(item.borrowedAt, 'dd/MM/yyyy', { locale: vi })} → Trả: ${format(item.returnedAt, 'dd/MM/yyyy', { locale: vi })}`
                                        : item.returnedAt 
                                        ? `Ngày trả: ${format(item.returnedAt, 'dd/MM/yyyy', { locale: vi })}`
                                        : 'Không rõ'
                                    }
                                    status={item.status === 'Trả trễ' ? 'danger' : 'success'}
                                >
                                    <Badge variant={item.status === 'Trả trễ' ? 'destructive' : 'outline'} className="mt-1">{item.status}</Badge>
                                </TimelineItem>
                            ))}
                        </Timeline>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

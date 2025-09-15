"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Unsubscribe, doc, getDoc, getDocs } from 'firebase/firestore';
import { Book, Reader } from '@/lib/types';
import { getPersonalizedBookRecommendations } from '@/ai/flows/personalized-book-recommendations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BookOpen, Sparkles, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Borrowal {
    id: string;
    bookId: string;
    userId: string;
    dueDate: Date;
}

interface BorrowedBookView extends Book {
    dueDate: string;
}

export default function MyBooksPage() {
    const { user } = useAuth();
    const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBookView[]>([]);
    const [recommendations, setRecommendations] = useState<string[] | null>(null);
    const [allBooks, setAllBooks] = useState<Book[]>([]);
    const [activeBorrowals, setActiveBorrowals] = useState<Borrowal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRecoLoading, setIsRecoLoading] = useState(false);

    // Listener for all books
    useEffect(() => {
        const booksQuery = collection(db, 'books');
        const unsubscribe = onSnapshot(booksQuery, (snapshot) => {
            const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
            setAllBooks(books);
        });
        return () => unsubscribe();
    }, []);

    // Listener for user's active borrowals
    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        const borrowalsQuery = query(collection(db, 'borrowals'), where('userId', '==', user.id), where('status', '==', 'borrowed'));
        const unsubscribe = onSnapshot(borrowalsQuery, (snapshot) => {
            const borrowals = snapshot.docs.map(d => ({
                id: d.id,
                bookId: d.data().bookId,
                userId: d.data().userId,
                dueDate: d.data().dueDate.toDate(),
            } as Borrowal));
            setActiveBorrowals(borrowals);
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
                        dueDate: format(borrowal.dueDate, 'PPP'),
                    };
                }
                return null;
            })
            .filter((b): b is BorrowedBookView => b !== null);

        setBorrowedBooks(borrowedBookDetails);
    }, [activeBorrowals, allBooks]);

    const generateRecommendations = async () => {
        if (!user) return;
        setIsRecoLoading(true);
        setRecommendations(null);

        try {
            // Get the most up-to-date user data
            const userDocRef = doc(db, 'users', user.id);
            const userSnapshot = await getDoc(userDocRef);

            if (!userSnapshot.exists()) {
                throw new Error("User data not found.");
            }
            const readerData = userSnapshot.data() as Reader;

            // Fetch titles for all books they have ever borrowed.
            // borrowingHistory and borrowedBooks store IDs. We need to fetch titles.
            const historyIds = [...new Set([...(readerData.borrowingHistory || []), ...(readerData.borrowedBooks || [])])];
            let historyTitles: string[] = [];
            
            if(historyIds.length > 0) {
                 // Firestore 'in' query is limited to 30 elements. Chunk if necessary.
                 // For this app, assuming a user's history won't exceed this is acceptable.
                 const historyBooksQuery = query(collection(db, 'books'), where('__name__', 'in', historyIds));
                 const historyBooksSnapshot = await getDocs(historyBooksQuery);
                 historyTitles = historyBooksSnapshot.docs.map(doc => doc.data().title);
            }

            const result = await getPersonalizedBookRecommendations({
                readerId: user.id,
                borrowingHistory: historyTitles,
                preferences: '', // Preferences field can be added in the future
            });
            setRecommendations(result.recommendations);
        } catch (e: any) {
            console.error("Failed to generate recommendations:", e);
        } finally {
            setIsRecoLoading(false);
        }
    }
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }


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
                <h1 className="text-2xl font-bold">Please Log In</h1>
                <p className="text-muted-foreground">You need to be logged in to see your books.</p>
             </div>
         )
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold font-headline text-primary">My Books</h1>
                <p className="text-muted-foreground mt-2">
                    Welcome back, {user.name}! Here's an overview of your library activity.
                </p>
            </header>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign />Outstanding Fees</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(user.lateFees || 0)}</p>
                    <p className="text-sm text-muted-foreground">Please settle any outstanding fees at the library front desk.</p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookOpen />Currently Borrowed</CardTitle>
                        <CardDescription>The books you currently have checked out.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {borrowedBooks.length > 0 ? (
                            <div className="space-y-4">
                                {borrowedBooks.map(book => (
                                    <div key={book.id} className="flex justify-between items-center p-3 rounded-lg bg-secondary">
                                        <div>
                                            <p className="font-semibold">{book.title}</p>
                                            <p className="text-sm text-muted-foreground">by {book.author}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">Due: {book.dueDate}</p>
                                            <Badge variant={new Date(book.dueDate) < new Date() ? 'destructive' : 'outline'}>
                                                {new Date(book.dueDate) < new Date() ? 'Overdue' : 'Borrowed'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">You have no books currently borrowed. <Button variant="link" asChild><Link href="/books">Browse books</Link></Button></p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sparkles />AI Recommendations</CardTitle>
                        <CardDescription>Books you might like based on your history.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center min-h-[200px]">
                        {isRecoLoading ? (
                             <div className="text-center text-muted-foreground">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                <p className="mt-2">Thinking of some great books for you...</p>
                            </div>
                        ): recommendations ? (
                             <ul className="space-y-2 list-disc list-inside w-full">
                                {recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center">
                                <p className="text-muted-foreground mb-4">Click the button to get some new reading ideas!</p>
                                <Button onClick={generateRecommendations}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate My Recommendations
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    )
}

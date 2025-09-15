"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Unsubscribe, doc } from 'firebase/firestore';
import { Book, Reader, Notification, Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getPersonalizedBookRecommendations, PersonalizedBookRecommendationsOutput } from '@/ai/flows/personalized-book-recommendations';
import { Loader2, BookOpen, Clock, History, DollarSign, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface BorrowedBook extends Book {
    dueDate: string;
}

export default function MyBooksPage() {
    const { user } = useAuth();
    const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
    const [borrowingHistory, setBorrowingHistory] = useState<Book[]>([]);
    const [recommendations, setRecommendations] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRecoLoading, setIsRecoLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        };

        setIsLoading(true);

        const bookSubs: Unsubscribe[] = [];

        // 1. Get Currently Borrowed Books
        if (user.borrowedBooks && user.borrowedBooks.length > 0) {
            const borrowedBooksQuery = query(collection(db, 'books'), where('__name__', 'in', user.borrowedBooks));
            const borrowalsQuery = query(collection(db, 'borrowals'), where('userId', '==', user.id), where('status', '==', 'borrowed'));

            const unsubBorrowed = onSnapshot(borrowedBooksQuery, (bookSnapshot) => {
                const unsubBorrowals = onSnapshot(borrowalsQuery, (borrowalSnapshot) => {
                     const dueDatesMap = new Map(borrowalSnapshot.docs.map(d => [d.data().bookId, d.data().dueDate.toDate()]));
                     const books = bookSnapshot.docs.map(doc => ({
                         id: doc.id,
                         ...doc.data(),
                         dueDate: dueDatesMap.get(doc.id) ? format(dueDatesMap.get(doc.id)!, 'PPP') : 'N/A'
                     } as BorrowedBook));
                     setBorrowedBooks(books);
                });
                bookSubs.push(unsubBorrowals);
            });
            bookSubs.push(unsubBorrowed);
        } else {
            setBorrowedBooks([]);
        }

        // 2. Get Borrowing History Titles (simple for now)
        const readerRef = doc(db, 'users', user.id);
        const unsubReader = onSnapshot(readerRef, (doc) => {
            const readerData = doc.data() as Reader;
            const allHistoryTitles = [...new Set([...(readerData.borrowingHistory || []), ...(readerData.borrowedBooks || [])])];
            
            // This is a simplified version. For a full history, a `history` collection would be better.
            // Here, we just display titles. We can't easily get full book objects for a large history.
        });
        bookSubs.push(unsubReader);


        setIsLoading(false);

        return () => {
            bookSubs.forEach(unsub => unsub());
        };

    }, [user]);

    const generateRecommendations = async () => {
        if (!user) return;
        setIsRecoLoading(true);
        try {
            const readerData = (await getDoc(doc(db, 'users', user.id))).data() as Reader;
             const historyTitles = [...new Set([...(readerData.borrowingHistory || []), ...(borrowedBooks.map(b => b.title))])]
            const result = await getPersonalizedBookRecommendations({
                readerId: user.id,
                borrowingHistory: historyTitles,
                preferences: '',
            });
            setRecommendations(result.recommendations);
        } catch (e) {
            console.error(e);
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

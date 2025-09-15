"use client"

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Book } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface GenreData {
  name: string;
  value: number;
}

const COLORS = [
    'hsl(var(--chart-1))', 
    'hsl(var(--chart-2))', 
    'hsl(var(--chart-3))', 
    'hsl(var(--chart-4))', 
    'hsl(var(--chart-5))',
    'hsl(210 29% 24%)',
    'hsl(206 82% 56%)'
];

export function GenreDistributionChart() {
    const [data, setData] = useState<GenreData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const booksRef = collection(db, 'books');
        const borrowalsRef = query(collection(db, 'borrowals'), where('status', '==', 'borrowed'));

        const unsubBooks = onSnapshot(booksRef, (booksSnapshot) => {
            const booksMap = new Map(booksSnapshot.docs.map(doc => [doc.id, doc.data() as Book]));

            const unsubBorrowals = onSnapshot(borrowalsRef, (borrowalsSnapshot) => {
                setLoading(true);
                const genreCounts: { [key: string]: number } = {};

                borrowalsSnapshot.forEach(doc => {
                    const bookId = doc.data().bookId;
                    const book = booksMap.get(bookId);
                    if (book?.genre) {
                        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
                    }
                });

                const chartData = Object.entries(genreCounts)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);

                setData(chartData);
                setLoading(false);
            });

            return () => unsubBorrowals();
        });

        return () => unsubBooks();
    }, []);

    if (loading) {
        return <Skeleton className="h-[350px] w-full" />;
    }
    
    if (data.length === 0 && !loading) {
        return (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No books are currently borrowed to show genre data.
            </div>
        )
    }

    return (
        <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip 
                         contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                        }} 
                    />
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={110}
                        innerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

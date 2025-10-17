"use client"

import { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { collection } from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase';
import { Skeleton } from '../ui/skeleton';

interface DailyActivity {
  date: string;
  borrowed: number;
  returned: number;
}

export function BorrowingTrendsChart() {
    const [data, setData] = useState<DailyActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date();
        const last7Days = subDays(today, 6);
        const dateInterval = eachDayOfInterval({ start: last7Days, end: today });
        
        const initialData = dateInterval.map(day => ({
            date: format(day, 'dd MMM', { locale: vi }),
            borrowed: 0,
            returned: 0,
        }));

        const borrowalsRef = collection(db, 'borrowals');
        const unsubscribe = safeOnSnapshot(borrowalsRef, (snapshot: any) => {
            setLoading(true);
            const processedData = [...initialData].map(d => ({ ...d })); // Deep copy

            snapshot.forEach((doc: any) => {
                const borrowal = doc.data();
                const borrowedAt = borrowal.borrowedAt?.toDate();
                const returnedAt = borrowal.returnedAt?.toDate();

                if (borrowedAt && borrowedAt >= last7Days && borrowedAt <= today) {
                    const dayKey = format(borrowedAt, 'dd MMM', { locale: vi });
                    const entry = processedData.find(d => d.date === dayKey);
                    if (entry) {
                        entry.borrowed += 1;
                    }
                }
                
                if (returnedAt && returnedAt >= last7Days && returnedAt <= today) {
                     const dayKey = format(returnedAt, 'dd MMM', { locale: vi });
                    const entry = processedData.find(d => d.date === dayKey);
                    if (entry) {
                        entry.returned += 1;
                    }
                }
            });
            
            setData(processedData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Skeleton className="h-[350px] w-full" />
    }

    return (
        <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                        }} 
                    />
                    <Legend />
                    <Bar dataKey="borrowed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Mượn" />
                    <Bar dataKey="returned" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Trả" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

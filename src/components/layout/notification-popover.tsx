"use client"

import { useState, useEffect } from 'react';
import { db, safeOnSnapshot } from '@/lib/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Notification, toDate } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotificationPopoverProps {
    userId: string;
}

export function NotificationPopover({ userId }: NotificationPopoverProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        if (!userId) return;

        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = safeOnSnapshot(q, (snapshot: any) => {
            const fetchedNotifications: Notification[] = [];
            let count = 0;
            snapshot.forEach((doc: any) => {
                const data = doc.data();
                if (!data.isRead) {
                    count++;
                }
                fetchedNotifications.push({ 
                    id: doc.id, 
                    ...data,
                    createdAt: data.createdAt?.toDate() // Convert Firestore Timestamp to JS Date
                } as Notification);
            });
            setNotifications(fetchedNotifications);
            setUnreadCount(count);
        }, (error) => {
            console.error("Lỗi khi lấy thông báo:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tải thông báo.' });
        });

        return () => unsubscribe();
    }, [userId, toast]);

    const handleAction = async (action: 'mark-all-read' | 'clear-all') => {
        if ((action === 'mark-all-read' && unreadCount === 0) || (action === 'clear-all' && notifications.length === 0)) {
            return;
        }

        try {
             const response = await fetch('/api/notifications', {
                method: action === 'clear-all' ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            // State will be updated by the onSnapshot listener, so no need to toast here
        } catch (error: unknown) {
            console.error(`Lỗi với tác vụ ${action}:`, error);
            toast({ variant: 'destructive', title: 'Lỗi', description: `Không thể ${action.replace('-', ' ')}.` });
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Mở thông báo">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0">
                           {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 z-[100]" align="end" sideOffset={8}>
                <div className="p-4">
                    <h4 className="font-medium leading-none">Thông báo</h4>
                </div>
                <Separator />
                <ScrollArea className="h-96">
                    {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-center text-muted-foreground">Bạn chưa có thông báo nào.</p>
                    ) : (
                        <div className="p-2">
                           {notifications.map(notif => (
                               <div key={notif.id} className="p-2 flex items-start rounded-lg hover:bg-secondary">
                                   {!notif.isRead && <div className="h-2 w-2 rounded-full bg-accent mt-1.5 mr-2 shrink-0"></div>}
                                   <div className={cn("flex-grow", notif.isRead && "ml-4")}>
                                        <p className="text-sm">{notif.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {notif.createdAt ? formatDistanceToNow(toDate(notif.createdAt) || new Date(), { addSuffix: true }) : 'vừa xong'}
                                        </p>
                                   </div>
                               </div>
                           ))}
                        </div>
                    )}
                </ScrollArea>
                {notifications.length > 0 && (
                    <>
                        <Separator />
                        <div className="p-2 flex flex-col sm:flex-row gap-2 justify-between">
                            <Button variant="ghost" size="sm" onClick={() => handleAction('mark-all-read')} disabled={unreadCount === 0} className="text-xs sm:text-sm">
                                <CheckCheck className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">Đánh dấu đã đọc</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleAction('clear-all')} className="text-destructive hover:text-destructive text-xs sm:text-sm">
                                <Trash2 className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">Xóa tất cả</span>
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}

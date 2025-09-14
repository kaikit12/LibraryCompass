"use client"

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/lib/types';
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

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotifications: Notification[] = [];
            let count = 0;
            snapshot.forEach((doc) => {
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
            console.error("Error fetching notifications:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch notifications.' });
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
        } catch (error: any) {
            console.error(`Error with ${action}:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not ${action.replace('-', ' ')}.` });
        }
    };


    const getIconForType = (type: Notification['type']) => {
        const baseClass = "h-4 w-4 mr-3";
        switch (type) {
            case 'success': return <CheckCheck className={cn(baseClass, "text-green-500")} />;
            case 'warning': return <Bell className={cn(baseClass, "text-yellow-500")} />;
            default: return <Bell className={cn(baseClass, "text-muted-foreground")} />;
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0">
                           {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
                <div className="p-4">
                    <h4 className="font-medium leading-none">Notifications</h4>
                </div>
                <Separator />
                <ScrollArea className="h-96">
                    {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-center text-muted-foreground">You have no notifications.</p>
                    ) : (
                        <div className="p-2">
                           {notifications.map(notif => (
                               <div key={notif.id} className="p-2 flex items-start rounded-lg hover:bg-secondary">
                                   {!notif.isRead && <div className="h-2 w-2 rounded-full bg-accent mt-1.5 mr-2 shrink-0"></div>}
                                   <div className={cn("flex-grow", notif.isRead && "ml-4")}>
                                        <p className="text-sm">{notif.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {notif.createdAt ? formatDistanceToNow(notif.createdAt, { addSuffix: true }) : 'just now'}
                                        </p>
                                   </div>
                               </div>
                           ))}
                        </div>
                    )}
                </ScrollArea>
                 <Separator />
                 <div className="p-2 flex justify-between">
                     <Button variant="ghost" size="sm" onClick={() => handleAction('mark-all-read')} disabled={unreadCount === 0}>
                         <CheckCheck className="mr-2 h-4 w-4" />
                         Mark all as read
                     </Button>
                     <Button variant="ghost" size="sm" onClick={() => handleAction('clear-all')} disabled={notifications.length === 0} className="text-destructive hover:text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" />
                         Clear all
                     </Button>
                 </div>
            </PopoverContent>
        </Popover>
    );
}

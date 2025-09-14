"use client"

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, writeBatch } from 'firebase/firestore';
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

    const handleMarkAllRead = async () => {
        const unreadNotifs = notifications.filter(n => !n.isRead);
        if (unreadNotifs.length === 0) return;

        const batch = writeBatch(db);
        unreadNotifs.forEach(notif => {
            const notifRef = doc(db, 'users', userId, 'notifications', notif.id);
            batch.update(notifRef, { isRead: true });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update notifications.' });
        }
    };
    
    const handleClearAll = async () => {
        if (notifications.length === 0) return;
        
        const batch = writeBatch(db);
        notifications.forEach(notif => {
            const notifRef = doc(db, 'users', userId, 'notifications', notif.id);
            batch.delete(notifRef);
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error clearing notifications:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not clear notifications.' });
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
                     <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                         <CheckCheck className="mr-2 h-4 w-4" />
                         Mark all as read
                     </Button>
                     <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={notifications.length === 0} className="text-destructive hover:text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" />
                         Clear all
                     </Button>
                 </div>
            </PopoverContent>
        </Popover>
    );
}

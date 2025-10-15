'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Wishlist } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Heart, Trash2, BookMarked, Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function MyWishlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [wishlist, setWishlist] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Wishlist | null>(null);
  const [editPriority, setEditPriority] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      loadWishlist();
    }
  }, [user]);

  const loadWishlist = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/wishlist?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch wishlist');

      const data = await response.json();
      setWishlist(data.wishlist || []);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách đọc',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (wishlistId: string) => {
    setRemoving(wishlistId);
    try {
      const response = await fetch(`/api/wishlist?wishlistId=${wishlistId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove from wishlist');

      toast({
        title: 'Đã xóa',
        description: 'Đã xóa sách khỏi danh sách đọc',
      });

      await loadWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa khỏi danh sách đọc',
        variant: 'destructive',
      });
    } finally {
      setRemoving(null);
    }
  };

  const handleEdit = (item: Wishlist) => {
    setEditingItem(item);
    setEditPriority(item.priority || 'medium');
    setEditNotes(item.notes || '');
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wishlistId: editingItem.id,
          priority: editPriority,
          notes: editNotes,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast({
        title: 'Đã cập nhật',
        description: 'Đã cập nhật thông tin sách',
      });

      setEditingItem(null);
      await loadWishlist();
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Ưu tiên cao</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Bình thường</Badge>;
      case 'low':
        return <Badge variant="secondary">Không gấp</Badge>;
      default:
        return <Badge variant="outline">Chưa đặt</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Danh sách đọc ({wishlist.length})
          </CardTitle>
          <CardDescription>Những cuốn sách bạn muốn đọc</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Danh sách đọc ({wishlist.length})
          </CardTitle>
          <CardDescription>
            Những cuốn sách bạn muốn đọc. Thêm sách bằng nút{' '}
            <Heart className="inline h-4 w-4" /> trên trang Kho sách.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wishlist.length === 0 ? (
            <div className="text-center py-12">
              <BookMarked className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Danh sách đọc của bạn đang trống
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Hãy thêm sách bạn muốn đọc vào đây!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlist.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="flex gap-4 p-4">
                    <Link
                      href={`/books/${item.bookId}`}
                      className="relative w-20 h-28 flex-shrink-0 bg-muted rounded overflow-hidden"
                    >
                      {item.bookImageUrl ? (
                        <Image
                          src={item.bookImageUrl}
                          alt={item.bookTitle}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <BookMarked className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link href={`/books/${item.bookId}`}>
                        <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors">
                          {item.bookTitle}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {item.bookAuthor}
                      </p>
                      
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        {getPriorityBadge(item.priority)}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          💭 {item.notes}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Thêm: {format(new Date(item.addedAt), 'dd/MM/yyyy', { locale: vi })}
                      </p>

                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(item.id)}
                          disabled={removing === item.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {removing === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Xóa
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin</DialogTitle>
            <DialogDescription>
              {editingItem?.bookTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Độ ưu tiên</label>
              <Select value={editPriority} onValueChange={setEditPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Ưu tiên cao</SelectItem>
                  <SelectItem value="medium">Bình thường</SelectItem>
                  <SelectItem value="low">Không gấp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea
                placeholder="Tại sao bạn muốn đọc sách này?"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
              disabled={updating}
            >
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Book, BookConditionDetail } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BookConditionManagerProps {
  book: Book;
  onUpdate?: (updatedBook: Book) => void;
}

const conditionLabels = {
  good: { label: 'Tốt', color: 'bg-green-500', textColor: 'text-green-700' },
  fair: { label: 'Khá', color: 'bg-blue-500', textColor: 'text-blue-700' },
  damaged: { label: 'Hư hỏng', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  lost: { label: 'Mất', color: 'bg-red-500', textColor: 'text-red-700' }
};

export function BookConditionManager({ book, onUpdate }: BookConditionManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [conditionDetails, setConditionDetails] = useState<BookConditionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCopy, setEditingCopy] = useState<BookConditionDetail | null>(null);
  const [newCopyForm, setNewCopyForm] = useState<{
    copyId: string;
    condition: BookConditionDetail['condition'];
    notes?: string;
  }>({
    copyId: '',
    condition: 'good',
    notes: ''
  });

  // Initialize condition details from book data
  useEffect(() => {
    if (book.conditionDetails && book.conditionDetails.length > 0) {
      setConditionDetails(book.conditionDetails);
    } else {
      // Create default condition details based on quantity
      const defaultDetails: BookConditionDetail[] = [];
      for (let i = 1; i <= book.quantity; i++) {
        defaultDetails.push({
          copyId: `${book.id}-${String(i).padStart(3, '0')}`,
          condition: book.condition || 'good',
          lastChecked: new Date(),
          updatedBy: user?.uid || 'system'
        });
      }
      setConditionDetails(defaultDetails);
    }
  }, [book, user]);

  const getConditionSummary = () => {
    const summary = conditionDetails.reduce((acc, detail) => {
      acc[detail.condition] = (acc[detail.condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return summary;
  };

  const updateBookCondition = async (updatedDetails: BookConditionDetail[]) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const bookRef = doc(db, 'books', book.id);
      
      // Calculate overall condition based on majority
      const summary = updatedDetails.reduce((acc, detail) => {
        acc[detail.condition] = (acc[detail.condition] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const overallCondition = Object.entries(summary)
        .sort(([,a], [,b]) => b - a)[0][0] as 'good' | 'fair' | 'damaged' | 'lost';

      const updatedBook = {
        ...book,
        condition: overallCondition,
        conditionDetails: updatedDetails,
        updatedAt: new Date()
      };

      await updateDoc(bookRef, {
        condition: overallCondition,
        conditionDetails: updatedDetails,
        updatedAt: new Date()
      });

      setConditionDetails(updatedDetails);
      onUpdate?.(updatedBook);
      
      toast({
        title: 'Cập nhật thành công',
        description: 'Tình trạng sách đã được cập nhật.'
      });
    } catch (error) {
      console.error('Error updating book condition:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật tình trạng sách.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCopy = (copyId: string, updates: Partial<BookConditionDetail>) => {
    const updatedDetails = conditionDetails.map(detail =>
      detail.copyId === copyId
        ? {
            ...detail,
            ...updates,
            lastChecked: new Date(),
            updatedBy: user?.uid || 'unknown'
          }
        : detail
    );
    updateBookCondition(updatedDetails);
  };

  const handleAddCopy = () => {
    if (!newCopyForm.copyId.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập mã cuốn sách.',
        variant: 'destructive'
      });
      return;
    }

    const exists = conditionDetails.some(detail => detail.copyId === newCopyForm.copyId);
    if (exists) {
      toast({
        title: 'Lỗi',
        description: 'Mã cuốn sách đã tồn tại.',
        variant: 'destructive'
      });
      return;
    }

    const newDetail: BookConditionDetail = {
      copyId: newCopyForm.copyId,
      condition: newCopyForm.condition,
      notes: newCopyForm.notes || undefined,
      lastChecked: new Date(),
      updatedBy: user?.uid || 'unknown'
    };

    const updatedDetails = [...conditionDetails, newDetail];
    updateBookCondition(updatedDetails);
    
  setNewCopyForm(prev => ({ ...prev, copyId: '', condition: 'good', notes: '' }));
  };

  const handleDeleteCopy = (copyId: string) => {
    const updatedDetails = conditionDetails.filter(detail => detail.copyId !== copyId);
    updateBookCondition(updatedDetails);
  };

  const summary = getConditionSummary();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings size={16} />
          Quản lý tình trạng
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quản lý tình trạng sách: {book.title}</DialogTitle>
          <DialogDescription>
            Cập nhật tình trạng từng cuốn sách riêng biệt
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tổng quan tình trạng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(summary).map(([condition, count]) => {
                const config = conditionLabels[condition as keyof typeof conditionLabels];
                return (
                  <Badge key={condition} variant="secondary" className="gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.color}`} />
                    {config.label}: {count} cuốn
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add New Copy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus size={20} />
              Thêm cuốn mới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="copyId">Mã cuốn sách</Label>
                <Input
                  id="copyId"
                  value={newCopyForm.copyId}
                  onChange={(e) => setNewCopyForm(prev => ({ ...prev, copyId: e.target.value }))}
                  placeholder="VD: ABC-001"
                />
              </div>
              <div>
                <Label htmlFor="condition">Tình trạng</Label>
                <Select
                  value={newCopyForm.condition}
                  onValueChange={(value) => setNewCopyForm(prev => ({ 
                    ...prev, 
                    condition: value as 'good' | 'fair' | 'damaged' | 'lost' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(conditionLabels).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${config.color}`} />
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddCopy} disabled={isLoading} className="w-full">
                  Thêm cuốn
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
              <Textarea
                id="notes"
                value={newCopyForm.notes}
                onChange={(e) => setNewCopyForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ghi chú về tình trạng..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Existing Copies */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Danh sách cuốn sách ({conditionDetails.length})</h3>
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {conditionDetails.map((detail) => {
              const config = conditionLabels[detail.condition];
              return (
                <Card key={detail.copyId} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {detail.copyId}
                      </Badge>
                      <Badge variant="secondary" className="gap-2">
                        <div className={`w-3 h-3 rounded-full ${config.color}`} />
                        {config.label}
                      </Badge>
                      {detail.notes && (
                        <span className="text-sm text-muted-foreground">
                          &ldquo;{detail.notes}&rdquo;
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={detail.condition}
                        onValueChange={(value) => handleUpdateCopy(detail.copyId, { 
                          condition: value as 'good' | 'fair' | 'damaged' | 'lost' 
                        })}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(conditionLabels).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${config.color}`} />
                                {config.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCopy(detail.copyId)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {conditionDetails.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
            <p>Chưa có thông tin tình trạng cho cuốn sách nào.</p>
            <p className="text-sm">Thêm cuốn đầu tiên để bắt đầu quản lý.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
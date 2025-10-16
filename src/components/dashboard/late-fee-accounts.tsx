"use client";

import { useState, useEffect } from 'react';
import { Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, CheckCircle2, Loader2, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface LateFeeAccount {
  id: string;
  name: string;
  email: string;
  memberId: string;
  lateFees: number;
}

export function LateFeeAccounts() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<LateFeeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    const usersQuery = collection(db, 'users');

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const accountsWithFees: LateFeeAccount[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Reader;
        
        // Chỉ lấy tài khoản có nợ phí (lateFees > 0)
        if (data.lateFees && data.lateFees > 0) {
          accountsWithFees.push({
            id: doc.id,
            name: data.name || 'Không có tên',
            email: data.email || '',
            memberId: String(data.memberId || ''),
            lateFees: data.lateFees,
          });
        }
      });

      // Sort theo số tiền nợ giảm dần
      accountsWithFees.sort((a, b) => b.lateFees - a.lateFees);
      
      setAccounts(accountsWithFees);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResetFee = async (account: LateFeeAccount) => {
    setResettingId(account.id);
    
    try {
      const userRef = doc(db, 'users', account.id);
      
      await updateDoc(userRef, {
        lateFees: 0,
      });

      toast({
        title: '✅ Đã xác nhận thanh toán',
        description: `Đã reset phí trễ của ${account.name} (${account.memberId}) về 0đ.`,
      });

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể reset phí trễ.';
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: message,
      });
    } finally {
      setResettingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Filter accounts by search ID
  const filteredAccounts = accounts.filter((account) => {
    if (!searchId.trim()) return true;
    const search = searchId.trim().toLowerCase();
    return (
      account.id.toLowerCase().includes(search) ||
      account.memberId.toLowerCase().includes(search) ||
      account.name.toLowerCase().includes(search) ||
      account.email.toLowerCase().includes(search)
    );
  });

  const totalFees = filteredAccounts.reduce((sum, acc) => sum + acc.lateFees, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="font-headline flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              Tài khoản nợ phí trễ ({filteredAccounts.length}/{accounts.length})
            </CardTitle>
            <CardDescription>
              Danh sách độc giả có phí trễ chưa thanh toán
            </CardDescription>
          </div>
          {accounts.length > 0 && (
            <>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Lọc theo ID, mã thẻ..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Tổng nợ</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalFees)}
                </p>
              </div>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã thẻ</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Số tiền nợ</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {account.memberId}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="text-base font-semibold">
                        {formatCurrency(account.lateFees)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={resettingId === account.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {resettingId === account.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Xác nhận đã trả
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận thanh toán phí trễ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn xác nhận rằng <strong>{account.name}</strong> ({account.memberId}) 
                              đã thanh toán <strong className="text-orange-600">{formatCurrency(account.lateFees)}</strong> phí trễ hạn?
                              <br /><br />
                              Số tiền nợ sẽ được reset về <strong>0đ</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleResetFee(account)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Xác nhận đã thanh toán
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : accounts.length > 0 ? (
          <div className="text-center text-muted-foreground p-8">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Không tìm thấy tài khoản nào với từ khóa &quot;{searchId}&quot;</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Không có tài khoản nào nợ phí trễ</p>
            <p className="text-sm mt-1">Tất cả độc giả đều đã thanh toán đầy đủ</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

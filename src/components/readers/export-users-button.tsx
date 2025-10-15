'use client';

import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/lib/types';
import { exportUsersToCSV } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

export function ExportUsersButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      exportUsersToCSV(users);

      toast({
        title: 'Xuất dữ liệu thành công',
        description: `Đã xuất ${users.length} người dùng ra file CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Lỗi xuất dữ liệu',
        description: 'Không thể xuất dữ liệu. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" disabled={loading} onClick={handleExport}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang xuất...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Xuất CSV
        </>
      )}
    </Button>
  );
}

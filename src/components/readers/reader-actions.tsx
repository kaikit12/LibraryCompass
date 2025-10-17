"use client";

import { useState, useMemo, useEffect } from "react";
import { Book, Reader } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, PlusCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { db } from "@/lib/firebase";
import { collection, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteUserChecklist } from "./delete-user-checklist";


const RoleBadge = ({ role }: { role: Reader['role'] }) => {
    const variant: "default" | "secondary" | "destructive" | "outline" = 
        role === 'admin' ? 'default' 
        : role === 'librarian' ? 'default' 
        : 'secondary';
    
    const className = 
        role === 'admin' ? 'bg-primary/90 hover:bg-primary/80'
        : role === 'librarian' ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
        : '';

  const viRole = role === 'admin' ? 'Quản trị' : role === 'librarian' ? 'Thủ thư' : 'Bạn đọc';
  return <Badge variant={variant} className={className}>{viRole}</Badge>;
}


export function ReaderActions() {
  const { user: currentUser } = useAuth();
  const currentUserRole = currentUser?.role;

  const [readers, setReaders] = useState<Reader[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"reader" | "librarian" | "admin">("reader");
  const { toast } = useToast();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingReader, setEditingReader] = useState<Partial<Reader> | null>(null);
  const [isDeleteChecklistOpen, setIsDeleteChecklistOpen] = useState(false);
  const [readerToDelete, setReaderToDelete] = useState<Reader | null>(null);

  useEffect(() => {
    const unsubscribeReaders = onSnapshot(collection(db, "users"), (snapshot) => {
      const liveReaders = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        role: doc.data().role || 'reader',
        lateFees: doc.data().lateFees || 0,
        emailVerified: doc.data().emailVerified || false,
        memberId: doc.data().memberId,
        borrowingHistory: doc.data().borrowingHistory || []
      } as Reader));
      setReaders(liveReaders);
    });
      
    const unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
        const liveBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        setBooks(liveBooks);
    });
      
    return () => {
        unsubscribeReaders();
        unsubscribeBooks();
    };
  }, []);

  const enrichedReaders = useMemo(() => {
    if (!readers.length || !books.length) return [];
    
    const bookTitleMap = new Map(books.map(book => [book.id, book.title]));

    return readers.map(reader => {
        const borrowedBookTitles = (reader.borrowedBooks || [])
            .map((bookId: string) => bookTitleMap.get(bookId) || 'Unknown Book')
            .concat(reader.borrowingHistory || []); 
            
        const uniqueTitles = [...new Set(borrowedBookTitles)];

        return {
            ...reader,
            borrowingHistory: uniqueTitles,
        }
    });
  }, [readers, books]);

  const filteredReaders = useMemo(() => {
    return enrichedReaders.filter(reader => {
      // Filter by active tab (role)
      const matchesRole = reader.role === activeTab;
      
      // Filter by search term (case-insensitive)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        reader.name.toLowerCase().includes(searchLower) ||
        reader.email.toLowerCase().includes(searchLower) ||
        reader.memberId?.toString().includes(searchTerm) || // Member ID search
        reader.phone?.toLowerCase().includes(searchLower);
      
      return matchesRole && matchesSearch;
    });
  }, [enrichedReaders, searchTerm, activeTab]);

  const getBorrowedBooksCount = (readerId: string) => {
    return readers.find(r => r.id === readerId)?.booksOut || 0;
  }

  const getCountByRole = (role: Reader['role']) => {
    return readers.filter(r => r.role === role).length;
  }

  const handleOpenAdd = () => {
    setEditingReader({ lateFees: 0, role: activeTab }); // Default to current tab role
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (reader: Reader) => {
    setEditingReader(reader);
    setIsAddEditOpen(true);
  };

  const handleSaveReader = async () => {
    if (!editingReader?.name || !editingReader?.email) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập tên và email.'});
      return;
    }

    try {
        if (editingReader.id) {
            const readerRef = doc(db, 'users', editingReader.id);
            await updateDoc(readerRef, {
                name: editingReader.name,
                email: editingReader.email,
                phone: editingReader.phone || '',
                lateFees: Number(editingReader.lateFees) || 0,
                role: editingReader.role || 'reader',
            });
            toast({ title: '✅ Cập nhật bạn đọc', description: `Hồ sơ của ${editingReader.name} đã được cập nhật.`});
        }
        // Note: Adding a new user is disabled in the UI, registration flow handles it.
        setIsAddEditOpen(false);
        setEditingReader(null);

  } catch {
    toast({ variant: 'destructive', title: '❌ Lỗi', description: 'Có lỗi khi lưu thông tin bạn đọc.'});
    }
  };

  const handleDeleteReader = async (readerId: string) => {
    const reader = readers.find(r => r.id === readerId);
    if (!reader) return;
    
    if (reader.booksOut > 0) {
      toast({ variant: 'destructive', title: 'Không thể thực hiện', description: 'Không thể xóa bạn đọc đang có sách mượn.'});
      return;
    }
    
    // Open checklist dialog
    setReaderToDelete(reader);
    setIsDeleteChecklistOpen(true);
  };

  const confirmDeleteReader = async () => {
    if (!readerToDelete) return;
    
    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: readerToDelete.id }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Không thể xóa bạn đọc.');
      }

      toast({ 
        title: '✅ Bước 1 hoàn tất', 
        description: 'Đã xóa khỏi Firestore. Tiếp tục xóa trong Firebase Authentication Console.',
        duration: 8000,
      });
      
      setIsDeleteChecklistOpen(false);
      setReaderToDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể xóa bạn đọc.';
      toast({ variant: 'destructive', title: '❌ Lỗi', description: message });
    }
  };

  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  const canEdit = (targetUser: Reader) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return currentUser.id !== targetUser.id; // Admin can edit anyone but themselves
    // Librarian cannot edit any users
    return false;
  }

  const canDelete = (targetUser: Reader) => {
    if (!currentUser) return false;
    if (targetUser.booksOut > 0) return false; // Can't delete if they have books out
    if (currentUser.id === targetUser.id) return false; // Can't delete self

    if (currentUser.role === 'admin') return true; // Admin can delete anyone (without books)
    // Librarian cannot delete any users
    return false;
  }


  if (currentUserRole === 'reader') {
      return (
          <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Bạn không có quyền truy cập trang này.
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "reader" | "librarian" | "admin")}>
          <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="reader" className="flex-1 sm:flex-none">
                Bạn đọc ({getCountByRole('reader')})
              </TabsTrigger>
              {/* Only admin can see librarian and admin tabs */}
              {currentUserRole === 'admin' && (
                <>
                  <TabsTrigger value="librarian" className="flex-1 sm:flex-none">
                    Thủ thư ({getCountByRole('librarian')})
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="flex-1 sm:flex-none">
                    Quản trị ({getCountByRole('admin')})
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm theo tên hoặc email..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {/* Only admin can add users */}
              {currentUserRole === 'admin' && (
                <Button onClick={handleOpenAdd}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Thêm
                </Button>
              )}
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <div className="overflow-x-auto">
              <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Email Verified</TableHead>
                        <TableHead>Đang mượn</TableHead>
                        <TableHead>Phí trễ</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReaders.length > 0 ? filteredReaders.map(readerItem => (
                        <TableRow key={readerItem.id}>
                            <TableCell className="font-mono font-bold text-primary">
                                {readerItem.memberId ? `#${readerItem.memberId}` : '-'}
                            </TableCell>
                            <TableCell className="font-medium">{readerItem.name}</TableCell>
                            <TableCell>{readerItem.email}</TableCell>
                            <TableCell>
                                <Badge variant={readerItem.emailVerified ? 'default' : 'destructive'}>
                                    {readerItem.emailVerified ? '✓ Đã xác thực' : '✗ Chưa xác thực'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                            <Badge variant="outline">{getBorrowedBooksCount(readerItem.id)}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={(readerItem.lateFees || 0) > 0 ? 'destructive' : 'secondary'}>
                                    {formatCurrency(readerItem.lateFees || 0)}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <RoleBadge role={readerItem.role} />
                            </TableCell>
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Mở menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                {canEdit(readerItem) && (
                                    <DropdownMenuItem onClick={() => handleOpenEdit(readerItem)}>Sửa hồ sơ</DropdownMenuItem>
                                )}
                                {canDelete(readerItem) && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Xóa hồ sơ</DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                                                <AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn hồ sơ của {readerItem.name}. Không thể hoàn tác.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteReader(readerItem.id)}>Tiếp tục</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                            Không tìm thấy bạn đọc nào.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                {filteredReaders.length > 0 ? filteredReaders.map(readerItem => (
                    <div key={readerItem.id} className="border rounded-lg p-4 flex flex-col space-y-3">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="font-bold text-lg">{readerItem.name}</h3>
                                <p className="text-sm text-muted-foreground">{readerItem.email}</p>
                            </div>
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 -mr-2 -mt-2 flex-shrink-0">
                                    <span className="sr-only">Mở menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                    {canEdit(readerItem) && (
                                        <DropdownMenuItem onClick={() => handleOpenEdit(readerItem)}>Sửa hồ sơ</DropdownMenuItem>
                                    )}
                                    {canDelete(readerItem) && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Xóa hồ sơ</DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                                                    <AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn hồ sơ của {readerItem.name}. Không thể hoàn tác.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteReader(readerItem.id)}>Tiếp tục</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Đang mượn</span>
                            <Badge variant="outline">{getBorrowedBooksCount(readerItem.id)}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Phí trễ</span>
                            <Badge variant={(readerItem.lateFees || 0) > 0 ? 'destructive' : 'secondary'}>
                                {formatCurrency(readerItem.lateFees || 0)}
                            </Badge>
                        </div>
                         <div className="flex justify-between text-sm items-center">
                            <span className="text-muted-foreground">Vai trò</span>
                            <RoleBadge role={readerItem.role} />
                        </div>
                    </div>
                )) : (
                     <div className="col-span-1 sm:col-span-2 h-24 text-center flex items-center justify-center text-muted-foreground">
                        Không tìm thấy bạn đọc nào.
                    </div>
                )}
            </div>

        </div>
        
        <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingReader?.id ? 'Sửa thông tin bạn đọc' : 'Thêm bạn đọc mới'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Tên</Label>
                <Input id="name" value={editingReader?.name || ''} onChange={e => setEditingReader({...editingReader, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" value={editingReader?.email || ''} onChange={e => setEditingReader({...editingReader, email: e.target.value})} className="col-span-3" disabled/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Số điện thoại</Label>
                <Input id="phone" value={editingReader?.phone || ''} onChange={e => setEditingReader({...editingReader, phone: e.target.value})} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Vai trò</Label>
                 <Select value={editingReader?.role || 'reader'} onValueChange={(value) => setEditingReader({...editingReader, role: value as Reader['role']})} disabled={currentUserRole !== 'admin'}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="reader">Bạn đọc</SelectItem>
                        <SelectItem value="librarian">Thủ thư</SelectItem>
                        <SelectItem value="admin">Quản trị</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
               <DialogClose asChild><Button type="button" variant="secondary">Hủy</Button></DialogClose>
              <Button type="submit" onClick={handleSaveReader}>Lưu thay đổi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Checklist */}
        <DeleteUserChecklist
          open={isDeleteChecklistOpen}
          onOpenChange={setIsDeleteChecklistOpen}
          userName={readerToDelete?.name || ''}
          userEmail={readerToDelete?.email || ''}
          onConfirm={confirmDeleteReader}
        />
        
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { Book, Reader } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, PlusCircle, Search, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RecommendationsDialog } from "./recommendations-dialog";
import { Badge } from "../ui/badge";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "@/context/auth-context";


interface ReaderActionsProps {
}


export function ReaderActions({ }: ReaderActionsProps) {
  const { user } = useAuth();
  const currentUserRole = user?.role;

  const [readers, setReaders] = useState<Reader[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingReader, setEditingReader] = useState<Partial<Reader> | null>(null);
  const [isRecoDialogOpen, setIsRecoDialogOpen] = useState(false);
  const [selectedReaderForReco, setSelectedReaderForReco] = useState<Reader | null>(null);

  useEffect(() => {
    const unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
        const liveBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        setBooks(liveBooks);
    });
      
    const unsubscribeReaders = onSnapshot(collection(db, "readers"), (snapshot) => {
      const liveReaders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), role: doc.data().role || 'reader' } as Reader));
      setReaders(liveReaders);
    });

    return () => {
        unsubscribeReaders();
        unsubscribeBooks();
    }
  }, []);

  const enrichedReaders = useMemo(() => {
    if (!readers.length || !books.length) return [];
    
    const bookTitleMap = new Map(books.map(book => [book.id, book.title]));

    return readers.map(reader => {
        const borrowedBookTitles = (reader.borrowedBooks || [])
            .map(bookId => bookTitleMap.get(bookId) || 'Unknown Book')
            // This is a simple way to simulate a broader history.
            // In a real app, you'd store historical borrows in a separate collection.
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
      return reader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             reader.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [enrichedReaders, searchTerm]);

  const getBorrowedBooksCount = (readerId: string) => {
    return readers.find(r => r.id === readerId)?.booksOut || 0;
  }

  const handleOpenAdd = () => {
    setEditingReader({ lateFees: 0, role: 'reader' });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (reader: Reader) => {
    setEditingReader(reader);
    setIsAddEditOpen(true);
  };

  const handleSaveReader = async () => {
    if (!editingReader?.name || !editingReader?.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in name and email.'});
      return;
    }

    try {
        if (editingReader.id) {
            const readerRef = doc(db, 'readers', editingReader.id);
            await updateDoc(readerRef, {
                name: editingReader.name,
                email: editingReader.email,
                phone: editingReader.phone || '',
                lateFees: Number(editingReader.lateFees) || 0,
                role: editingReader.role || 'reader',
            });
            toast({ title: '✅ Reader Updated', description: `Profile for ${editingReader.name} has been updated.`});
        } else {
            // This path is less likely with auth in place, but kept for completeness
            await addDoc(collection(db, 'readers'), {
                name: editingReader.name,
                email: editingReader.email,
                phone: editingReader.phone || '',
                booksOut: 0,
                borrowedBooks: [],
                lateFees: 0,
                role: editingReader.role || 'reader',
            });
            toast({ title: '✅ Reader Added', description: `${editingReader.name} has been added.`});
        }
        setIsAddEditOpen(false);
        setEditingReader(null);

    } catch(error) {
        toast({ variant: 'destructive', title: '❌ Error', description: 'There was a problem saving the reader.'});
    }
  };

  const handleDeleteReader = async (readerId: string) => {
    const reader = readers.find(r => r.id === readerId);
    if (reader && reader.booksOut > 0) {
        toast({ variant: 'destructive', title: 'Action Denied', description: 'Cannot delete reader with borrowed books.'});
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'readers', readerId));
        toast({ title: '✅ Reader Deleted', description: 'The reader has been removed from the system.'});
    } catch(error) {
        toast({ variant: 'destructive', title: '❌ Error', description: 'Could not delete reader.'});
    }
  };

  const handleOpenRecoDialog = (reader: Reader) => {
    // Find the fully enriched reader object from our memoized list
    const enrichedReader = enrichedReaders.find(r => r.id === reader.id);
    if (enrichedReader) {
        setSelectedReaderForReco(enrichedReader);
        setIsRecoDialogOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find reader data.' });
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  if (currentUserRole === 'reader') {
      return (
          <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                  You do not have permission to view this page.
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          { (currentUserRole === 'admin' || currentUserRole === 'librarian') && (
            <Button onClick={handleOpenAdd} disabled>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Reader (via Register)
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Books Out</TableHead>
                <TableHead>Late Fees</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredReaders.length > 0 ? filteredReaders.map(reader => (
                <TableRow key={reader.id}>
                    <TableCell className="font-medium">{reader.name}</TableCell>
                    <TableCell>{reader.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getBorrowedBooksCount(reader.id)}</Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={reader.lateFees > 0 ? 'destructive' : 'secondary'}>
                            {formatCurrency(reader.lateFees || 0)}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary">{reader.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenRecoDialog(reader)}>
                            <Sparkles className="mr-2 h-4 w-4 text-accent-foreground/80"/>
                            Get Recommendations
                        </DropdownMenuItem>
                         { (currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                           <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenEdit(reader)}>Edit Profile</DropdownMenuItem>
                           </>
                         )}
                         { currentUserRole === 'admin' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={reader.booksOut > 0 || reader.id === user?.id}>Delete Profile</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete {reader.name}'s profile. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteReader(reader.id)}>Continue</AlertDialogAction>
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
                    <TableCell colSpan={6} className="h-24 text-center">
                    No readers found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
        
        <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingReader?.id ? 'Edit Reader' : 'Add New Reader'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={editingReader?.name || ''} onChange={e => setEditingReader({...editingReader, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" value={editingReader?.email || ''} onChange={e => setEditingReader({...editingReader, email: e.target.value})} className="col-span-3" disabled/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" value={editingReader?.phone || ''} onChange={e => setEditingReader({...editingReader, phone: e.target.value})} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lateFees" className="text-right">Late Fees</Label>
                <Input id="lateFees" type="number" value={editingReader?.lateFees || 0} onChange={e => setEditingReader({...editingReader, lateFees: Number(e.target.value)})} className="col-span-3" disabled={currentUserRole !== 'admin'} />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                 <Select value={editingReader?.role || 'reader'} onValueChange={(value) => setEditingReader({...editingReader, role: value as Reader['role']})} disabled={currentUserRole !== 'admin'}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="reader">Reader</SelectItem>
                        <SelectItem value="librarian">Librarian</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
               <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" onClick={handleSaveReader}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {selectedReaderForReco && (
            <RecommendationsDialog 
                reader={selectedReaderForReco} 
                isOpen={isRecoDialogOpen} 
                setIsOpen={setIsRecoDialogOpen} 
            />
        )}
      </CardContent>
    </Card>
  );
}

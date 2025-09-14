"use client";

import { useState, useMemo, useEffect } from "react";
import { Book, Reader } from "@/lib/types";
import { genres } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, PlusCircle, Search, QrCode, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { BorrowDialog } from "./borrow-dialog";
import { QRCodeDialog } from "./qr-code-dialog";
import { useAuth } from "@/context/auth-context";
import { PersonalizedRecommendationsDialog } from "./recommendations-dialog";

interface BookActionsProps {
}

export function BookActions({ }: BookActionsProps) {
  const { user } = useAuth();
  const currentUserRole = user?.role;

  const [books, setBooks] = useState<Book[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const { toast } = useToast();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isBorrowOpen, setIsBorrowOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isRecoDialogOpen, setIsRecoDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [editingBook, setEditingBook] = useState<Partial<Book> | null>(null);
  
  useEffect(() => {
    const unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
      const liveBooks = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
              id: doc.id, 
              ...data,
          } as Book
      });
      setBooks(liveBooks);
    });
    
    const unsubscribeReaders = onSnapshot(collection(db, "users"), (snapshot) => {
      const liveReaders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reader));
      setReaders(liveReaders);
    });

    return () => {
        unsubscribeBooks();
        unsubscribeReaders();
    };
  }, []);

  const enrichedReaders = useMemo(() => {
    if (!readers.length || !books.length) return [];
    
    const bookTitleMap = new Map(books.map(book => [book.id, book.title]));

    return readers.map(reader => {
        const borrowedBookTitles = (reader.borrowedBooks || [])
            .map(bookId => bookTitleMap.get(bookId) || 'Unknown Book')
            .concat(reader.borrowingHistory || []); 
            
        const uniqueTitles = [...new Set(borrowedBookTitles)];

        return {
            ...reader,
            borrowingHistory: uniqueTitles,
        }
    });
  }, [readers, books]);


  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const searchMatch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || book.author.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || book.status.toLowerCase() === statusFilter;
      const genreMatch = genreFilter === 'all' || book.genre === genreFilter;
      return searchMatch && statusMatch && genreMatch;
    });
  }, [books, searchTerm, statusFilter, genreFilter]);

  const handleOpenAdd = () => {
    setEditingBook({ quantity: 1, available: 1 });
    setIsAddEditOpen(true);
  }

  const handleOpenEdit = (book: Book) => {
    setEditingBook(book);
    setIsAddEditOpen(true);
  }
  
  const handleSaveBook = async () => {
    if (!editingBook?.title || !editingBook?.author || !editingBook?.genre || editingBook?.quantity === undefined) {
      toast({ variant: 'destructive', title: '❌ Error', description: 'Please fill all required fields.'});
      return;
    }
    
    const quantity = Number(editingBook.quantity)
    const available = editingBook.id ? Number(editingBook.available) : quantity;

     if (isNaN(quantity) || quantity < 0) {
      toast({ variant: 'destructive', title: '❌ Error', description: 'Quantity must be a non-negative number.' });
      return;
    }

    try {
      if (editingBook.id) {
        // Edit
        const bookRef = doc(db, 'books', editingBook.id);
        await updateDoc(bookRef, {
            title: editingBook.title,
            author: editingBook.author,
            genre: editingBook.genre,
            quantity: quantity,
        });
        toast({ title: '✅ Book Updated', description: `"${editingBook.title}" has been updated.`});
      } else {
        // Add
        await addDoc(collection(db, 'books'), {
            title: editingBook.title,
            author: editingBook.author,
            genre: editingBook.genre,
            quantity: quantity,
            available: available,
            status: available > 0 ? 'Available' : 'Borrowed'
        });
        toast({ title: '✅ Book Added', description: `"${editingBook.title}" has been added to the library.`});
      }
      setIsAddEditOpen(false);
      setEditingBook(null);
    } catch (error) {
      toast({ variant: 'destructive', title: '❌ Error', description: 'There was a problem saving the book.'});
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    try {
      await deleteDoc(doc(db, 'books', bookId));
      toast({ title: '✅ Book Deleted', description: 'The book has been removed from the library.'});
    } catch (error) {
       toast({ variant: 'destructive', title: '❌ Error', description: 'Could not delete book.'});
    }
  }

  const handleOpenBorrow = (book: Book) => {
    setSelectedBook(book);
    setIsBorrowOpen(true);
  };
  
  const handleOpenQR = (book: Book) => {
    setSelectedBook(book);
    setIsQROpen(true);
  }

  const handleReturnBookByTitle = async (book: Book) => {
    const userWithBook = readers.find(reader => reader.borrowedBooks.includes(book.id));
    
    if (!userWithBook) {
      toast({ variant: 'destructive', title: '❌ Return failed', description: "Could not find a reader who has this book borrowed."});
      return;
    }
    
    try {
        const response = await fetch('/api/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: book.id, userId: userWithBook.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        toast({ title: '✅ Return successful!', description: data.message});
    } catch (error: any) {
         toast({ variant: 'destructive', title: '❌ Return failed', description: error.message});
    }
  };


  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4 flex-wrap">
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <div className="relative sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by title or author..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Borrowed">Borrowed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Filter by genre" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Genres</SelectItem>
                        {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          
            <div className="flex gap-2">
                 <Button onClick={() => setIsRecoDialogOpen(true)} variant="outline" className="w-full sm:w-auto">
                    <Sparkles className="mr-2 h-4 w-4" /> AI Recommendations
                </Button>
                { (currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                    <Button onClick={handleOpenAdd} className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Book
                    </Button>
                )}
            </div>
        </div>

        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.length > 0 ? filteredBooks.map(book => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">{book.title}</TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell><Badge variant="secondary">{book.genre}</Badge></TableCell>
                <TableCell>{book.available} / {book.quantity}</TableCell>
                <TableCell>
                  <Badge variant={book.status === 'Available' ? 'default' : 'destructive'} className={book.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {book.status}
                  </Badge>
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
                       <DropdownMenuItem onClick={() => handleOpenBorrow(book)} disabled={book.available === 0}>
                        Borrow
                      </DropdownMenuItem>
                      {(currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                        <DropdownMenuItem onClick={() => handleReturnBookByTitle(book)} disabled={book.available === book.quantity}>
                          Return
                        </DropdownMenuItem>
                      )}
                       <DropdownMenuItem onClick={() => handleOpenQR(book)}>
                        <QrCode className="mr-2 h-4 w-4" />
                        View QR Code
                      </DropdownMenuItem>
                      { (currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenEdit(book)}>Edit</DropdownMenuItem>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently delete "{book.title}". This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteBook(book.id)}>Continue</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No books found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBook?.id ? 'Edit Book' : 'Add New Book'}</DialogTitle>
              <DialogDescription>
                {editingBook?.id ? 'Update the details of this book.' : 'Enter the details for the new book.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input id="title" value={editingBook?.title || ''} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="author" className="text-right">Author</Label>
                <Input id="author" value={editingBook?.author || ''} onChange={e => setEditingBook({...editingBook, author: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="genre" className="text-right">Genre</Label>
                 <Select value={editingBook?.genre || ''} onValueChange={(value) => setEditingBook({...editingBook, genre: value})}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a genre" />
                    </SelectTrigger>
                    <SelectContent>
                        {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                <Input id="quantity" type="number" value={editingBook?.quantity || 1} onChange={e => setEditingBook({...editingBook, quantity: Number(e.target.value)})} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={handleSaveBook}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedBook && (
            <BorrowDialog 
                book={selectedBook}
                readers={readers}
                isOpen={isBorrowOpen}
                setIsOpen={setIsBorrowOpen}
            />
        )}

        {selectedBook && (
            <QRCodeDialog
                book={selectedBook}
                isOpen={isQROpen}
                setIsOpen={setIsQROpen}
            />
        )}

        <PersonalizedRecommendationsDialog
            readers={enrichedReaders}
            isOpen={isRecoDialogOpen}
            setIsOpen={setIsRecoDialogOpen}
        />

      </CardContent>
    </Card>
  );
}

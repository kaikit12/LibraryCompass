"use client";

import { useState, useMemo, useEffect } from "react";
import { Book, User } from "@/lib/types";
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


interface UserActionsProps {
}


export function UserActions({ }: UserActionsProps) {
  const { user } = useAuth();
  const currentUserRole = user?.role;

  const [users, setUsers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [isRecoDialogOpen, setIsRecoDialogOpen] = useState(false);
  const [selectedUserForReco, setSelectedUserForReco] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
        const liveBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        setBooks(liveBooks);
    });
      
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const liveUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), role: doc.data().role || 'reader' } as User));
      setUsers(liveUsers);
    });

    return () => {
        unsubscribeUsers();
        unsubscribeBooks();
    }
  }, []);

  const enrichedUsers = useMemo(() => {
    if (!users.length || !books.length) return [];
    
    const bookTitleMap = new Map(books.map(book => [book.id, book.title]));

    return users.map(user => {
        const borrowedBookTitles = (user.borrowedBooks || [])
            .map(bookId => bookTitleMap.get(bookId) || 'Unknown Book')
            // This is a simple way to simulate a broader history.
            // In a real app, you'd store historical borrows in a separate collection.
            .concat(user.borrowingHistory || []); 
            
        const uniqueTitles = [...new Set(borrowedBookTitles)];

        return {
            ...user,
            borrowingHistory: uniqueTitles,
        }
    });
  }, [users, books]);

  const filteredUsers = useMemo(() => {
    return enrichedUsers.filter(user => {
      return user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [enrichedUsers, searchTerm]);

  const getBorrowedBooksCount = (userId: string) => {
    return users.find(r => r.id === userId)?.booksOut || 0;
  }

  const handleOpenAdd = () => {
    setEditingUser({ lateFees: 0, role: 'reader' });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsAddEditOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser?.name || !editingUser?.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in name and email.'});
      return;
    }

    try {
        if (editingUser.id) {
            const userRef = doc(db, 'users', editingUser.id);
            await updateDoc(userRef, {
                name: editingUser.name,
                email: editingUser.email,
                phone: editingUser.phone || '',
                lateFees: Number(editingUser.lateFees) || 0,
                role: editingUser.role || 'reader',
            });
            toast({ title: '✅ User Updated', description: `Profile for ${editingUser.name} has been updated.`});
        } else {
            // This path is less likely with auth in place, but kept for completeness
            await addDoc(collection(db, 'users'), {
                name: editingUser.name,
                email: editingUser.email,
                phone: editingUser.phone || '',
                booksOut: 0,
                borrowedBooks: [],
                lateFees: 0,
                role: editingUser.role || 'reader',
            });
            toast({ title: '✅ User Added', description: `${editingUser.name} has been added.`});
        }
        setIsAddEditOpen(false);
        setEditingUser(null);

    } catch(error) {
        toast({ variant: 'destructive', title: '❌ Error', description: 'There was a problem saving the user.'});
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(r => r.id === userId);
    if (userToDelete && userToDelete.booksOut > 0) {
        toast({ variant: 'destructive', title: 'Action Denied', description: 'Cannot delete user with borrowed books.'});
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'users', userId));
        toast({ title: '✅ User Deleted', description: 'The user has been removed from the system.'});
    } catch(error) {
        toast({ variant: 'destructive', title: '❌ Error', description: 'Could not delete user.'});
    }
  };

  const handleOpenRecoDialog = (user: User) => {
    // Find the fully enriched user object from our memoized list
    const enrichedUser = enrichedUsers.find(r => r.id === user.id);
    if (enrichedUser) {
        setSelectedUserForReco(enrichedUser);
        setIsRecoDialogOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find user data.' });
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
              <PlusCircle className="mr-2 h-4 w-4" /> Add User (via Register)
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
                {filteredUsers.length > 0 ? filteredUsers.map(userItem => (
                <TableRow key={userItem.id}>
                    <TableCell className="font-medium">{userItem.name}</TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getBorrowedBooksCount(userItem.id)}</Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={userItem.lateFees > 0 ? 'destructive' : 'secondary'}>
                            {formatCurrency(userItem.lateFees || 0)}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary">{userItem.role}</Badge>
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
                        <DropdownMenuItem onClick={() => handleOpenRecoDialog(userItem)}>
                            <Sparkles className="mr-2 h-4 w-4 text-accent-foreground/80"/>
                            Get Recommendations
                        </DropdownMenuItem>
                         { (currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                           <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenEdit(userItem)}>Edit Profile</DropdownMenuItem>
                           </>
                         )}
                         { currentUserRole === 'admin' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={userItem.booksOut > 0 || userItem.id === user?.id}>Delete Profile</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete {userItem.name}'s profile. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(userItem.id)}>Continue</AlertDialogAction>
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
                    No users found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
        
        <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser?.id ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={editingUser?.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" value={editingUser?.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="col-span-3" disabled/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" value={editingUser?.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lateFees" className="text-right">Late Fees</Label>
                <Input id="lateFees" type="number" value={editingUser?.lateFees || 0} onChange={e => setEditingUser({...editingUser, lateFees: Number(e.target.value)})} className="col-span-3" disabled={currentUserRole !== 'admin'} />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                 <Select value={editingUser?.role || 'reader'} onValueChange={(value) => setEditingUser({...editingUser, role: value as User['role']})} disabled={currentUserRole !== 'admin'}>
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
              <Button type="submit" onClick={handleSaveUser}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {selectedUserForReco && (
            <RecommendationsDialog 
                user={selectedUserForReco} 
                isOpen={isRecoDialogOpen} 
                setIsOpen={setIsRecoDialogOpen} 
            />
        )}
      </CardContent>
    </Card>
  );
}

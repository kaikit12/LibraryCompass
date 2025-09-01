"use client";

import { useState, useMemo } from "react";
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

interface ReaderActionsProps {
  initialReaders: Reader[];
  initialBooks: Book[];
}

export function ReaderActions({ initialReaders, initialBooks }: ReaderActionsProps) {
  const [readers, setReaders] = useState<Reader[]>(initialReaders);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingReader, setEditingReader] = useState<Partial<Reader> | null>(null);
  const [isRecoDialogOpen, setIsRecoDialogOpen] = useState(false);
  const [selectedReaderForReco, setSelectedReaderForReco] = useState<Reader | null>(null);

  const filteredReaders = useMemo(() => {
    return readers.filter(reader => {
      return reader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             reader.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [readers, searchTerm]);

  const getBorrowedBooksCount = (readerId: string) => {
    return initialBooks.filter(b => b.borrowedBy === readerId).length;
  }

  const handleOpenAdd = () => {
    setEditingReader({});
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (reader: Reader) => {
    setEditingReader(reader);
    setIsAddEditOpen(true);
  };

  const handleSaveReader = () => {
    if (!editingReader?.name || !editingReader?.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in name and email.'});
      return;
    }

    if (editingReader.id) {
      setReaders(readers.map(r => r.id === editingReader!.id ? {...r, ...editingReader} as Reader : r));
      toast({ title: 'Reader Updated', description: `Profile for ${editingReader.name} has been updated.`});
    } else {
      const newReader: Reader = {
        id: `reader-${Date.now()}`,
        name: editingReader.name,
        email: editingReader.email,
        phone: editingReader.phone || '',
        borrowingHistory: [],
      };
      setReaders([newReader, ...readers]);
      toast({ title: 'Reader Added', description: `${newReader.name} has been added.`});
    }
    setIsAddEditOpen(false);
    setEditingReader(null);
  };

  const handleDeleteReader = (readerId: string) => {
    if (initialBooks.some(b => b.borrowedBy === readerId)) {
        toast({ variant: 'destructive', title: 'Action Denied', description: 'Cannot delete reader with borrowed books.'});
        return;
    }
    setReaders(readers.filter(r => r.id !== readerId));
    toast({ title: 'Reader Deleted', description: 'The reader has been removed from the system.'});
  };

  const handleOpenRecoDialog = (reader: Reader) => {
    setSelectedReaderForReco(reader);
    setIsRecoDialogOpen(true);
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button onClick={handleOpenAdd}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Reader
            </Button>
          </div>

          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Books Out</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReaders.length > 0 ? filteredReaders.map(reader => (
                <TableRow key={reader.id}>
                  <TableCell className="font-medium">{reader.name}</TableCell>
                  <TableCell>{reader.email}</TableCell>
                  <TableCell>{reader.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getBorrowedBooksCount(reader.id)}</Badge>
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleOpenEdit(reader)}>Edit Profile</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Delete Profile</DropdownMenuItem>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No readers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Add/Edit Reader Dialog */}
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
              <Input id="email" type="email" value={editingReader?.email || ''} onChange={e => setEditingReader({...editingReader, email: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" value={editingReader?.phone || ''} onChange={e => setEditingReader({...editingReader, phone: e.target.value})} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
             <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleSaveReader}>Save changes</Button>
          </DialogFooter>
        </Dialog>
      </Dialog>
      
      {/* Recommendations Dialog */}
      {selectedReaderForReco && (
          <RecommendationsDialog 
              reader={selectedReaderForReco} 
              isOpen={isRecoDialogOpen} 
              setIsOpen={setIsRecoDialogOpen} 
          />
      )}
    </>
  );
}

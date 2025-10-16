'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export function DatabaseDebug() {
  const [status, setStatus] = useState('Checking database...');
  const [data, setData] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const checkDatabase = async () => {
    try {
      console.log('🔍 Starting database check...');
      console.log('🔐 Auth state:', auth.currentUser);
      
      // Check books collection
      const booksSnapshot = await getDocs(collection(db, 'books'));
      const books = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📚 Books found:', books.length, books);
      console.log('📊 Sample book data:', books[0]);
      
      setData({
        booksCount: books.length,
        books: books.slice(0, 3), // Show first 3 books
        authUser: auth.currentUser?.email || 'Not authenticated'
      });
      
      if (books.length === 0) {
        setStatus('❌ No books found in database');
      } else {
        setStatus(`✅ Found ${books.length} books`);
      }
      
    } catch (error) {
      console.error('Database check error:', error);
      setStatus(`❌ Error: ${error}`);
    }
  };

  const createSampleBooks = async () => {
    setCreating(true);
    try {
      const sampleBooks = [
        {
          title: 'Harry Potter và Hòn đá Phù thủy',
          author: 'J.K. Rowling',
          genre: 'Fantasy',
          status: 'Available',
          quantity: 5,
          available: 1, // Low stock
          condition: 'good',
          libraryId: 'HP001',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          title: 'Dế Mèn phiêu lưu ký',
          author: 'Tô Hoài',
          genre: 'Thiếu nhi',
          status: 'Available',
          quantity: 3,
          available: 0, // Critical stock
          condition: 'good',
          libraryId: 'DM002',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          title: 'Tắt đèn',
          author: 'Ngô Tất Tố',
          genre: 'Văn học',
          status: 'Available',
          quantity: 4,
          available: 2, // Warning stock
          condition: 'damaged',
          libraryId: 'TD003',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          title: 'Chí Phèo',
          author: 'Nam Cao',
          genre: 'Văn học',
          status: 'Available',
          quantity: 2,
          available: 0,
          condition: 'lost',
          libraryId: 'CP004',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const book of sampleBooks) {
        await addDoc(collection(db, 'books'), book);
      }

      setStatus(`✅ Created ${sampleBooks.length} sample books`);
      await checkDatabase(); // Refresh data
    } catch (error) {
      console.error('Error creating sample books:', error);
      setStatus(`❌ Error creating books: ${error}`);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          🔧 Database Debug
          <Badge variant={data?.booksCount > 0 ? "default" : "destructive"}>
            {data?.booksCount > 0 ? "Connected" : "No Data"}
          </Badge>
        </h3>
        <Button size="sm" onClick={checkDatabase} variant="outline">
          🔄 Refresh
        </Button>
      </div>
      
      <p className="text-sm mb-3">{status}</p>
      
      {data && (
        <div className="space-y-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-600">{data.booksCount}</div>
              <div className="text-xs text-muted-foreground">Books Found</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-green-600">
                {data.authUser !== 'Not authenticated' ? '✓' : '✗'}
              </div>
              <div className="text-xs text-muted-foreground">Auth Status</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center col-span-2 md:col-span-1">
              <div className="text-xs text-muted-foreground truncate">
                {data.authUser}
              </div>
            </div>
          </div>

          {/* Sample Books Cards */}
          {data.books.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sample Books:</Label>
              <div className="grid gap-2">
                {data.books.map((book: any, index: number) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{book.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {book.author} • {book.quantity || 0} cuốn
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {book.condition && (
                          <Badge variant="outline" className="text-xs">
                            {book.condition === 'good' ? '✓' : 
                             book.condition === 'damaged' ? '⚠️' : '❌'}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {book.available || 0}/{book.quantity || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {data.booksCount === 0 && (
              <Button size="sm" onClick={createSampleBooks} disabled={creating}>
                {creating ? '⏳ Creating...' : '📚 Create Sample Books'}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/books'}>
              📖 Manage Books
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
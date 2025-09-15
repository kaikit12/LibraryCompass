export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  status: 'Available' | 'Borrowed';
  borrowedBy?: string; // readerId
  dueDate?: string; // ISO string
  quantity: number;
  available: number;
  libraryId?: string; // Custom ID for library management
  lateFeePerDay?: number;
  imageUrl?: string;
  description?: string;
}

export interface Reader {
  id: string; // This will be the firebase uid
  uid: string;
  name: string;
  email: string;
  phone: string;
  booksOut: number;
  borrowedBooks: string[]; // array of book ids
  lateFees: number;
  borrowingHistory: string[]; // array of book titles, dynamically added
  role: 'admin' | 'librarian' | 'reader';
}


export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
    createdAt: any; // Firestore Timestamp
    isRead: boolean;
}

export interface Transaction {
    id: string;
    userId: string;
    bookId: string;
    borrowalId: string;
    amount: number;
    type: 'late_fee' | 'payment';
    createdAt: any; // Firestore Timestamp
}

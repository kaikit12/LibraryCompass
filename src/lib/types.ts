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
}

export interface Reader {
  id: string;
  name: string;
  email: string;
  phone: string;
  booksOut: number;
  borrowedBooks: string[]; // array of book ids
  lateFees: number;
  borrowingHistory: string[]; // array of book titles, dynamically added
  role: 'admin' | 'librarian' | 'reader';
}

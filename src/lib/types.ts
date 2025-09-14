export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  status: 'Available' | 'Borrowed';
  borrowedBy?: string; // readerId
  dueDate?: string; // ISO string
}

export interface Reader {
  id: string;
  name: string;
  email: string;
  phone: string;
  booksOut: number;
  borrowedBooks: string[]; // array of book ids
}

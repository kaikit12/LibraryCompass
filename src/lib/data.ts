import { Book, Reader } from './types';
import { subDays, addDays, formatISO } from 'date-fns';

export const initialReaders: Reader[] = [
  { id: 'reader-1', name: 'Alice Johnson', email: 'alice@example.com', phone: '123-456-7890', borrowingHistory: ['The Hobbit', '1984'] },
  { id: 'reader-2', name: 'Bob Smith', email: 'bob@example.com', phone: '234-567-8901', borrowingHistory: ['Dune', 'Pride and Prejudice'] },
  { id: 'reader-3', name: 'Charlie Brown', email: 'charlie@example.com', phone: '345-678-9012', borrowingHistory: ['To Kill a Mockingbird'] },
];

export const initialBooks: Book[] = [
  { id: 'book-1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Classic', status: 'Available' },
  { id: 'book-2', title: 'To Kill a Mockingbird', author: 'Harper Lee', genre: 'Classic', status: 'Borrowed', borrowedBy: 'reader-3', dueDate: formatISO(addDays(new Date(), 14)) },
  { id: 'book-3', title: '1984', author: 'George Orwell', genre: 'Dystopian', status: 'Borrowed', borrowedBy: 'reader-1', dueDate: formatISO(subDays(new Date(), 2)) }, // Overdue
  { id: 'book-4', title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', genre: 'Fantasy', status: 'Available' },
  { id: 'book-5', title: 'The Catcher in the Rye', author: 'J.D. Salinger', genre: 'Classic', status: 'Available' },
  { id: 'book-6', title: 'Dune', author: 'Frank Herbert', genre: 'Sci-Fi', status: 'Borrowed', borrowedBy: 'reader-2', dueDate: formatISO(addDays(new Date(), 5))},
  { id: 'book-7', title: 'Pride and Prejudice', author: 'Jane Austen', genre: 'Romance', status: 'Available' },
  { id: 'book-8', title: 'The Hobbit', author: 'J.R.R. Tolkien', genre: 'Fantasy', status: 'Borrowed', borrowedBy: 'reader-1', dueDate: formatISO(addDays(new Date(), 10)) },
];

export const genres = [
  'Classic',
  'Dystopian',
  'Fantasy',
  'Sci-Fi',
  'Romance',
  'Mystery',
  'Horror',
  'Biography'
]

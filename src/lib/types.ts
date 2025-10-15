export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string; // Deprecated: kept for backward compatibility
  genres?: string[]; // New: multiple genres support
  status: 'Available' | 'Borrowed';
  quantity: number;
  available: number;
  libraryId?: string; // Custom ID for library management
  lateFeePerDay?: number;
  imageUrl?: string;
  description?: string;
  reservationCount?: number; // Number of active reservations
  isbn?: string; // International Standard Book Number
  publicationYear?: number; // Year published
  rating?: number; // Average rating (0-5)
  reviewCount?: number; // Number of reviews
  totalBorrows?: number; // Total times borrowed (for popularity)
  // Series management
  series?: string; // Series name (e.g., "Harry Potter")
  seriesOrder?: number; // Order in series (1, 2, 3...)
  totalInSeries?: number; // Total books in series (e.g., 7)
}

export interface Reader {
  id: string; // firebase uid
  uid: string;
  memberId?: number; // Sequential member ID (e.g., 1, 2, 3...)
  name: string;
  email: string;
  phone: string;
  emailVerified?: boolean; // Email verification status
  booksOut: number;
  borrowedBooks: string[]; // array of book document ids
  lateFees: number;
  borrowingHistory: string[]; // array of historical book ids
  role: 'admin' | 'librarian' | 'reader';
  // 2FA fields
  twoFactorEnabled?: boolean; // Whether 2FA is enabled
  twoFactorSecret?: string; // TOTP secret (encrypted)
}

// Alias for Reader (commonly used as User in auth context)
export type User = Reader;

// Borrowal record interface
export interface Borrowal {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userEmail: string;
  borrowedAt: any; // Firestore Timestamp
  dueDate: any; // Firestore Timestamp
  returnedAt?: any; // Firestore Timestamp
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  createdAt?: Date; // normalized in UI when reading from Firestore
  isRead: boolean;
}

export interface Reservation {
  id: string;
  bookId: string;
  userId: string;
  bookTitle: string;
  userName: string;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: Date;
  position?: number; // Queue position (1 = next in line)
  notifiedAt?: Date; // When user was notified book is available
  expiresAt?: Date; // Reservation expires after 48 hours if not borrowed
}

export interface RenewalRequest {
  id: string;
  borrowalId: string;
  bookId: string;
  userId: string;
  bookTitle: string;
  userName: string;
  currentDueDate: Date;
  requestedDays: number; // Number of days to extend (default 14)
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string; // Admin/Librarian who processed the request
  rejectionReason?: string;
}

export interface Appointment {
  id: string;
  bookId: string;
  userId: string;
  bookTitle: string;
  userName: string;
  userMemberId?: number;
  pickupTime: Date; // Thời gian đến nhận sách
  agreedToTerms: boolean; // Đồng ý điều khoản trễ 2h
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired'; // expired = quá 2h không đến
  createdAt: Date;
  confirmedAt?: Date;
  confirmedBy?: string; // Admin/Librarian ID who confirmed
  borrowalId?: string; // ID của borrowal được tạo sau khi confirm
  cancellationReason?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  bookId: string;
  borrowalId: string;
  amount: number;
  type: 'late_fee' | 'payment';
  createdAt?: Date;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: Date;
  updatedAt?: Date;
  helpfulCount?: number; // Number of users who found review helpful
}

export interface Wishlist {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookImageUrl?: string;
  addedAt: Date;
  priority?: 'low' | 'medium' | 'high'; // Reading priority
  notes?: string; // Personal notes about why they want to read it
}

export interface LibrarySettings {
  id: string;
  logoUrl?: string;
  libraryName?: string;
  copyright?: string;
  email?: string;
  phone?: string;
  address?: string;
  updatedAt?: Date;
}

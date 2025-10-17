// Core Firebase types
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

// Utility function to safely convert FirebaseTimestamp to Date
export function toDate(timestamp: FirebaseTimestamp | Date | null | undefined): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return null;
}

// Helper to get milliseconds for sorting
export function getTimestamp(timestamp: FirebaseTimestamp | Date | null | undefined): number {
  const date = toDate(timestamp);
  return date ? date.getTime() : 0;
}

export interface FirebaseDocumentSnapshot {
  id: string;
  exists(): boolean;
  data(): Record<string, any>;
}

export interface FirebaseQuerySnapshot {
  docs: FirebaseDocumentSnapshot[];
  size: number;
  empty: boolean;
}

// Error types
export interface FirebaseError {
  code: string;
  message: string;
}

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  id: string;
}

// Validation types
export interface ValidationRule {
  required?: boolean;
  type?: string;
  minLength?: number;
  maxLength?: number;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// Export existing types
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  genre: string;
  description?: string;
  coverUrl?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  rating?: number;
  totalRatings?: number;
  location?: string;
  condition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged' | 'lost';
  publishedYear?: number;
  language?: string;
  pages?: number;
  publisher?: string;
  series?: string;
  seriesNumber?: number;
  tags?: string[];
  [key: string]: any;
}

export interface Reader {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  phone?: string; // Alternative phone field
  address?: string;
  membershipType: 'basic' | 'premium' | 'student';
  joinDate: FirebaseTimestamp;
  status: 'active' | 'suspended' | 'expired';
  borrowLimit: number;
  currentBorrowedBooks: number;
  totalBorrowedBooks: number;
  overdueCount: number;
  fines: number;
  role?: 'reader' | 'admin' | 'librarian'; // User role
  memberId?: string | number; // Member ID
  emailVerified?: boolean; // Email verification status
  lateFees?: number; // Late fees amount
  borrowingHistory?: unknown[]; // Borrowing history
  preferences?: {
    genres: string[];
    authors: string[];
    notifications: boolean;
  };
  [key: string]: any;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  readerId: string;
  borrowedAt: FirebaseTimestamp;
  dueDate: FirebaseTimestamp;
  returnedAt?: FirebaseTimestamp;
  renewalCount: number;
  status: 'active' | 'returned' | 'overdue' | 'lost';
  fineAmount?: number;
  notes?: string;
  [key: string]: any;
}

export interface Reservation {
  id: string;
  bookId: string;
  readerId: string;
  createdAt: FirebaseTimestamp;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired' | 'active';
  priority: number;
  expirationDate: FirebaseTimestamp;
  notificationSent: boolean;
  fulfilledAt?: FirebaseTimestamp;
  [key: string]: any;
}

export interface Review {
  id: string;
  bookId: string;
  readerId: string;
  rating: number;
  comment?: string;
  createdAt: FirebaseTimestamp;
  helpfulVotes: number;
  verified: boolean;
  [key: string]: any;
}

export interface Appointment {
  id: string;
  bookId: string;
  readerId: string;
  scheduledDate: FirebaseTimestamp;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'pending' | 'confirmed' | 'expired';
  type: 'pickup' | 'return';
  notes?: string;
  createdAt: FirebaseTimestamp;
  completedAt?: FirebaseTimestamp;
  [key: string]: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: FirebaseTimestamp;
  actionUrl?: string;
  [key: string]: any;
}

export interface WishlistItem {
  id: string;
  readerId: string;
  bookTitle: string;
  author: string;
  isbn?: string;
  createdAt: FirebaseTimestamp;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'available' | 'notified';
  [key: string]: any;
}

export interface Fine {
  id: string;
  readerId: string;
  borrowRecordId?: string;
  amount: number;
  reason: 'overdue' | 'damage' | 'loss' | 'other';
  status: 'pending' | 'paid' | 'waived';
  createdAt: FirebaseTimestamp;
  paidAt?: FirebaseTimestamp;
  description?: string;
  [key: string]: any;
}

export interface Users {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'librarian' | 'member';
  createdAt: FirebaseTimestamp;
}

// Alias for backwards compatibility
export type User = Reader;

// Additional missing types
export interface LibrarySettings {
  id: string;
  libraryName: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  [key: string]: any;
}

export interface BookConditionDetail {
  condition: 'new' | 'good' | 'fair' | 'poor' | 'damaged' | 'lost';
  notes?: string;
  dateRecorded: FirebaseTimestamp;
  recordedBy?: string;
  [key: string]: any;
}

export interface RenewalRequest {
  id: string;
  borrowRecordId: string;
  readerId: string;
  bookId: string;
  requestedAt: FirebaseTimestamp;
  status: 'pending' | 'approved' | 'denied';
  reason?: string;
  processedBy?: string;
  processedAt?: FirebaseTimestamp;
  [key: string]: any;
}

export interface Wishlist {
  id: string;
  readerId: string;
  bookTitle: string;
  author: string;
  isbn?: string;
  createdAt: FirebaseTimestamp;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'available' | 'notified';
  [key: string]: any;
}

// Alias for backwards compatibility  
export type Borrowal = BorrowRecord;
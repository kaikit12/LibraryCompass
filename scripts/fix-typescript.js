#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing TypeScript errors...');

// Fix src/lib/types.ts first - add proper type definitions
const typesContent = `// Core Firebase types
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
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
  condition?: 'new' | 'good' | 'fair' | 'poor';
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
  address?: string;
  membershipType: 'basic' | 'premium' | 'student';
  joinDate: FirebaseTimestamp;
  status: 'active' | 'suspended' | 'expired';
  borrowLimit: number;
  currentBorrowedBooks: number;
  totalBorrowedBooks: number;
  overdueCount: number;
  fines: number;
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
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
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
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
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
  lastLoginAt?: FirebaseTimestamp;
  isActive: boolean;
  avatar?: string;
  preferences?: Record<string, any>;
  [key: string]: any;
}`;

fs.writeFileSync('src/lib/types.ts', typesContent);
console.log('✅ Updated types.ts with proper TypeScript definitions');

// Fix specific files
const fixes = [
  {
    file: 'src/lib/security.ts',
    fixes: [
      {
        search: ': any',
        replace: ': unknown'
      },
      {
        search: 'export const sanitizeError = (error: unknown): string => {',
        replace: 'export const sanitizeError = (error: FirebaseError | Error | unknown): string => {'
      },
      {
        search: 'return error?.message || \'Unknown error\';',
        replace: 'return (error as FirebaseError)?.message || (error as Error)?.message || \'Unknown error\';'
      },
      {
        search: 'export const validateInput = (data: unknown, schema: unknown): string[] => {',
        replace: 'export const validateInput = (data: Record<string, any>, schema: ValidationSchema): string[] => {'
      },
      {
        search: 'for (const [key, rules] of Object.entries(schema)) {',
        replace: 'for (const [key, rule] of Object.entries(schema)) {'
      },
      {
        search: 'const value = data[key];',
        replace: 'const value = data[key];'
      }
    ]
  },
  {
    file: 'src/lib/performance.ts',
    fixes: [
      {
        search: ': any',
        replace: ': unknown'
      },
      {
        search: 'private handleMetric(metric: unknown): void {',
        replace: 'private handleMetric(metric: PerformanceMetric): void {'
      },
      {
        search: 'this.metrics[metric.name] = metric.value;',
        replace: 'this.metrics[(metric as PerformanceMetric).name] = (metric as PerformanceMetric).value;'
      }
    ]
  },
  {
    file: 'src/lib/firebase.ts',
    fixes: [
      {
        search: ': any',
        replace: ': unknown'
      },
      {
        search: 'if (docErr?.code !== \'permission-denied\' && error) {',
        replace: 'if ((docErr as FirebaseError)?.code !== \'permission-denied\' && error) {'
      },
      {
        search: 'if (err?.code !== \'permission-denied\' && error) {',
        replace: 'if ((err as FirebaseError)?.code !== \'permission-denied\' && error) {'
      },
      {
        search: 'if (err?.code === \'permission-denied\') {',
        replace: 'if ((err as FirebaseError)?.code === \'permission-denied\') {'
      }
    ]
  }
];

fixes.forEach(({ file, fixes: fileFixes }) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add imports at the top if needed
    if (file === 'src/lib/security.ts' && !content.includes('import { FirebaseError, ValidationSchema }')) {
      content = 'import { FirebaseError, ValidationSchema } from \'./types\';\n' + content;
    }
    if (file === 'src/lib/performance.ts' && !content.includes('import { PerformanceMetric }')) {
      content = 'import { PerformanceMetric } from \'./types\';\n' + content;
    }
    if (file === 'src/lib/firebase.ts' && !content.includes('import { FirebaseError }')) {
      content = 'import { FirebaseError } from \'./types\';\n' + content;
    }
    
    fileFixes.forEach(({ search, replace }) => {
      content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
    });
    
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed ${file}`);
  }
});

console.log('🎉 TypeScript fixes completed!');
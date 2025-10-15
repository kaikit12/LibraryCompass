# Library QR Code System - Setup Guide

## Overview

The Library QR Code System enables fast book lookup and management by scanning QR codes attached to physical books. Each book is assigned a unique Library ID that can be encoded in a QR code for instant scanning and searching.

## System Architecture

```
┌─────────────────┐
│  Physical Book  │
│  with QR Label  │
└────────┬────────┘
         │ Scan
         ▼
┌─────────────────┐
│ html5-qrcode    │
│ Scanner         │
└────────┬────────┘
         │ Extract Library ID
         ▼
┌─────────────────┐
│ Firestore Query │
│ where libraryId │
│ == scanned_id   │
└────────┬────────┘
         │ Return Book
         ▼
┌─────────────────┐
│ Highlight Book  │
│ in UI           │
└─────────────────┘
```

## Features

### 1. QR Code Generation
- Generate printable QR codes for each book
- Include library ID in human-readable format
- High error correction (Level H) for durability
- Optimized size (200x200px) for scanning

### 2. Quick Search
- Scan QR code to instantly find book
- Manual library ID entry fallback
- Visual highlight of found book
- Auto-scroll to book location in grid

### 3. Database Integration
- Firestore query by `libraryId` field
- Fast O(1) lookup with indexed field
- Support for both manual and scanned searches

## Implementation Details

### Library ID Format

**Pattern:** 8-digit hexadecimal (padded with zeros)
**Examples:**
- `00000001` (first book)
- `00000ABC` (book #2748)
- `0000FFFF` (book #65535)

**Generation Logic:**
```typescript
const generateLibraryId = (books: Book[]): string => {
  const hexIds = books
    .map(book => book.libraryId)
    .filter(id => id && /^[0-9A-Fa-f]+$/.test(id))
    .map(id => parseInt(id!, 16))
    .filter(num => !isNaN(num));
  
  const maxId = hexIds.length > 0 ? Math.max(...hexIds) : 0;
  return (maxId + 1).toString(16).toUpperCase().padStart(8, '0');
};
```

### QR Code Content

**Data Format:** Plain text library ID
```
00000001
```

**NOT a URL** - This makes QR codes smaller and more reliable than embedding full URLs.

### QR Code Specifications

```typescript
<QRCode
  value={book.libraryId}        // Plain library ID
  size={200}                    // 200x200 pixels
  level="H"                     // High error correction (30%)
  includeMargin={true}          // White margin around code
  bgColor="#ffffff"             // White background
  fgColor="#000000"             // Black foreground
/>
```

**Error Correction Levels:**
- L: 7% recovery (not recommended)
- M: 15% recovery (default)
- Q: 25% recovery (good)
- **H: 30% recovery (recommended for physical labels)**

## User Workflows

### Workflow 1: Generate QR Code Label

1. **Find Book**: Search or browse to locate book in system
2. **Open QR Dialog**: Click "..." → "Xem mã QR"
3. **View QR Code**: Dialog shows:
   - Large QR code (200x200px)
   - Book title and author
   - Library ID in monospace font
4. **Print**: Use browser print (Ctrl+P)
5. **Prepare Label**:
   - Cut QR code section
   - Optional: Laminate for durability
   - Optional: Add protective clear tape
6. **Attach to Book**:
   - Inside front cover (recommended)
   - Book spine (visible but may wear)
   - Back cover (accessible)

### Workflow 2: Quick Book Search

1. **Access Scanner**: Click "Quét QR Code" in Quick Search section
2. **Grant Permissions**: Allow camera access if prompted
3. **Start Scanner**: Click "Bắt đầu quét"
4. **Scan Code**: Point camera at QR code on book
5. **Auto Search**: System automatically:
   - Extracts library ID from QR code
   - Queries Firestore for matching book
   - Displays book information
   - Highlights book card in grid
   - Scrolls to book location
6. **View Details**: Click book card for full information

### Workflow 3: Manual Search (Fallback)

1. **Enter Library ID**: Type code from QR label (if scanner unavailable)
2. **Click Search**: System performs same lookup
3. **View Results**: Book highlighted if found

## Components

### QuickSearch Component

**File:** `src/components/books/quick-search.tsx`

**Purpose:** Unified search interface for QR scanning and manual ID entry

**Features:**
- QR code scanner integration
- Manual library ID text input
- Search button with loading state
- Result display card with:
  - Book cover image
  - Title and author
  - Genre badge
  - Availability status
  - Library ID

**State Management:**
```typescript
const [isScannerOpen, setIsScannerOpen] = useState(false);
const [libraryId, setLibraryId] = useState('');
const [isSearching, setIsSearching] = useState(false);
const [foundBook, setFoundBook] = useState<Book | null>(null);
```

**Search Function:**
```typescript
const searchByLibraryId = async (id: string) => {
  const booksRef = collection(db, 'books');
  const q = query(booksRef, where('libraryId', '==', id));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const book = snapshot.docs[0].data() as Book;
    setFoundBook(book);
    onBookFound?.(book);
  }
};
```

### QRCodeDialog Updates

**File:** `src/components/books/qr-code-dialog.tsx`

**Changes:**
- QR code now contains library ID (not full URL)
- Larger size: 200x200px (was 160px)
- Higher error correction: Level H (was Level L)
- Added library ID display below QR code
- Updated description for printing/attaching

**QR Content:**
```typescript
// OLD (URL-based):
const url = `${window.location.origin}/books/${book.id}`;

// NEW (Library ID-based):
const url = book.libraryId || book.id;
```

### BarcodeScanner Updates

**File:** `src/components/books/barcode-scanner.tsx`

**New Prop:** `mode`
```typescript
mode?: 'isbn' | 'library-id' | 'both' // default: 'both'
```

**Mode Behaviors:**
- **isbn**: Only accepts ISBN-10 or ISBN-13 barcodes
- **library-id**: Accepts any QR code data (library IDs)
- **both**: Tries ISBN extraction first, falls back to raw data

**Scan Handler:**
```typescript
if (mode === 'isbn') {
  result = extractISBN(decodedText);
} else if (mode === 'library-id') {
  result = decodedText; // Raw QR data
} else {
  result = extractISBN(decodedText) || decodedText;
}
```

## Database Schema

### Book Document

```typescript
interface Book {
  id: string;                    // Firestore document ID
  libraryId?: string;            // Library-assigned ID (for QR codes)
  title: string;
  author: string;
  // ... other fields
}
```

**Firestore Indexing:**
Ensure `libraryId` is indexed for fast queries:
```
Collection: books
Field: libraryId
Order: Ascending
```

## Best Practices

### QR Label Design

**Recommended Layout:**
```
┌─────────────────────┐
│                     │
│   [QR CODE 200px]   │
│                     │
├─────────────────────┤
│  Book Title         │
│  Author Name        │
│                     │
│  Library ID:        │
│  00000001           │
└─────────────────────┘
```

**Label Specifications:**
- Size: 2.5" x 2.5" (minimum)
- Material: Waterproof vinyl or laminated paper
- Adhesive: Permanent for inside cover, removable for spine
- Print Quality: 300 DPI minimum

### QR Code Placement

**Option 1: Inside Front Cover (Recommended)**
- ✅ Protected from wear and tear
- ✅ Easy to scan when book is open
- ✅ Doesn't obscure cover art
- ❌ Requires opening book

**Option 2: Book Spine**
- ✅ Visible without opening
- ✅ Quick scanning on shelf
- ❌ May wear over time
- ❌ Limited space on thin books

**Option 3: Back Cover**
- ✅ Accessible and visible
- ✅ Large space available
- ❌ May obscure publisher info
- ❌ More exposed to damage

### Scanning Tips

**For Librarians:**
1. Ensure adequate lighting
2. Hold scanner perpendicular to QR code
3. Distance: 10-30cm from code
4. Keep camera steady
5. Use manual entry if QR is damaged

**For Label Preparation:**
1. Test scan before mass printing
2. Use high-quality printer (avoid inkjet blur)
3. Laminate outdoor/high-use books
4. Keep backup database of library IDs
5. Document QR placement location

## Troubleshooting

### QR Code Won't Scan

**Problem:** Scanner can't read QR code

**Solutions:**
1. Check lighting (add lamp if needed)
2. Clean camera lens
3. Ensure QR code is flat (not warped)
4. Try different angle
5. Use manual library ID entry
6. Re-print QR code if degraded

**Prevention:**
- Laminate labels
- Use high error correction (Level H)
- Print at sufficient size (200px minimum)

### Book Not Found

**Problem:** Scanned QR shows "Book not found"

**Causes:**
1. Library ID mismatch in database
2. Book deleted from system
3. QR code contains wrong data

**Solutions:**
1. Verify library ID in database
2. Check if book.libraryId field exists
3. Re-generate and replace QR label
4. Search by title/author instead

### Duplicate Library IDs

**Problem:** Multiple books with same library ID

**Prevention:**
- Use auto-generate function (ensures uniqueness)
- Don't manually assign IDs without checking
- Add database constraint (if possible)

**Resolution:**
1. Identify duplicate entries
2. Regenerate unique IDs for duplicates
3. Re-print QR labels
4. Update physical labels on books

## Performance Optimization

### Database Query Optimization

**Index `libraryId` field:**
```bash
# Firebase Console → Firestore → Indexes → Create Index
Collection: books
Field: libraryId
Order: Ascending
```

**Query Performance:**
- Without index: O(n) - scans all documents
- With index: O(log n) - indexed lookup
- Typical: <50ms for indexed query

### Caching Strategy

**Client-side cache for frequent lookups:**
```typescript
const libraryIdCache = new Map<string, Book>();

const searchByLibraryId = async (id: string) => {
  // Check cache first
  if (libraryIdCache.has(id)) {
    return libraryIdCache.get(id);
  }
  
  // Query Firestore
  const book = await fetchFromFirestore(id);
  
  // Cache result
  libraryIdCache.set(id, book);
  
  return book;
};
```

## Security Considerations

### QR Code Data

**Current:** Plain library ID (00000001)
- ✅ Simple and reliable
- ✅ Small QR code size
- ✅ Works offline (ID is visible)
- ⚠️ No authentication

**Alternative:** Signed token
```typescript
// More secure but complex
const token = jwt.sign(
  { libraryId: book.libraryId },
  SECRET_KEY,
  { expiresIn: '1y' }
);
```

**Recommendation:** Current approach is sufficient for most libraries. Physical access to books already provides security boundary.

### Access Control

**Current Implementation:**
- QuickSearch: Admin/Librarian only
- QR Dialog: All roles can view
- Scanner: Camera permission required

**Recommendations:**
- ✅ Keep QuickSearch admin-only
- ✅ Allow readers to view QR for self-service
- ✅ Log all QR scans for audit trail

## Future Enhancements

- [ ] Batch QR code generation (print all books)
- [ ] QR code label templates (multiple layouts)
- [ ] Export QR codes to PDF for printing
- [ ] Mobile app for faster scanning
- [ ] NFC tag support as alternative to QR
- [ ] Audio feedback on successful scan
- [ ] Scan history and analytics
- [ ] Integration with label printer APIs
- [ ] Barcode + QR hybrid labels

## References

- [html5-qrcode Documentation](https://github.com/mebjas/html5-qrcode)
- [QR Code Specifications](https://www.qrcode.com/en/about/standards.html)
- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
- [QR Code Error Correction](https://www.qrcode.com/en/about/error_correction.html)

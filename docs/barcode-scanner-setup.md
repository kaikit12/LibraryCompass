# Barcode & QR Code Scanner Setup Guide

## Overview

LibraryCompass includes a dual-purpose scanner that supports:
1. **ISBN Barcode Scanning**: Automatically lookup book information from ISBN
2. **Library QR Code Scanning**: Quick search for books using library-assigned QR codes

This streamlines both book addition and book management workflows.

## Features

- **Dual-mode scanning**: ISBN barcodes OR library QR codes
- **Camera-based**: Uses html5-qrcode for detection
- **ISBN recognition**: Supports ISBN-10 and ISBN-13 formats
- **QR code recognition**: Scans library-generated QR codes containing book IDs
- **Automatic lookup**: Fetches book details from Open Library API (ISBN mode)
- **Quick search**: Instantly finds books in library database (QR mode)
- **Auto-fill form**: Populates book information automatically
- **Highlight found books**: Visual feedback when book is located
- **Print QR labels**: Generate QR codes to attach to physical books
- **Real-time detection**: Instant recognition when code is in view

## Technical Stack

- **html5-qrcode**: Browser-based barcode/QR code scanning library
- **Open Library API**: Free book metadata service (no API key required)
- **Camera API**: HTML5 MediaDevices API for camera access

## User Flow

### Workflow 1: Add Book via ISBN Barcode

1. Navigate to **Kho sách** (Books) page
2. Click **"Quét ISBN"** button (admin/librarian only)
3. Allow browser to access camera when prompted
4. Click **"Bắt đầu quét"** to activate camera
5. Point camera at ISBN barcode (usually on back cover or inside page)
6. Scanner automatically detects and reads barcode
7. Book information is fetched from Open Library API
8. Form pre-fills with book details

### Workflow 2: Find Book via Library QR Code

1. Navigate to **Kho sách** (Books) page  
2. In **"Tìm kiếm nhanh"** section, click **"Quét QR Code"**
3. Point camera at library QR code label on book
4. Scanner reads library ID from QR code
5. System searches database for matching book
6. Book card is highlighted and scrolled into view
7. Book details displayed in search result

### Workflow 3: Generate QR Code Label for Book

1. Find book in library (via search or browse)
2. Click **"..."** menu on book card
3. Select **"Xem mã QR"**
4. QR code dialog displays with:
   - Large, high-quality QR code
   - Book title and author
   - Library ID in readable format
5. Print the dialog (Ctrl+P or browser print)
6. Cut and laminate the QR code
7. Attach to book spine or inside cover

### 1. Scan ISBN Barcode

1. Navigate to **Kho sách** (Books) page
2. Click **"Quét ISBN"** button (admin/librarian only)
3. Allow browser to access camera when prompted
4. Click **"Bắt đầu quét"** to activate camera
5. Point camera at ISBN barcode (usually on back cover or inside page)
6. Scanner automatically detects and reads barcode
7. Book information is fetched from Open Library API
8. Form pre-fills with book details

### 2. Review and Add Book

1. Review auto-filled information:
   - Title
   - Author(s)
   - Description
   - ISBN
   - Publication year
   - Cover image
2. Adjust any fields if needed (genre, quantity, library ID)
3. Click **"Lưu"** to add book to library

### 3. Manual Entry (Fallback)

If book is not found in Open Library:
1. ISBN is pre-filled in the form
2. Enter book details manually
3. Use **"Tạo bằng AI"** for description if needed

## Components

### QuickSearch Component

Search interface for finding books by scanning library QR codes or entering library ID manually.

**Location:** Books page (admin/librarian only)

**Features:**
- QR code scanner button
- Manual library ID input field
- Search button with loading state
- Result display with book details
- Auto-highlight found book in grid
- Auto-scroll to book location

**Usage:**
```tsx
<QuickSearch onBookFound={(book) => {
  console.log('Found:', book.title);
  // Highlight and scroll to book
}} />
```

### BarcodeScanner Component

Modal dialog for scanning ISBN barcodes.

**Props:**
- `open`: boolean - Dialog visibility
- `onOpenChange`: (open: boolean) => void - Dialog state handler
- `onScanSuccess`: (data: string) => void - Callback with scanned data
- `mode`: 'isbn' | 'library-id' | 'both' - Scanning mode (default: 'both')
- `title`: string - Dialog title
- `description`: string - Dialog description

**Features:**
- Camera preview with overlay
- Start/Stop scanning controls
- ISBN extraction and validation
- Error handling for permissions
- Success/error alerts
- Usage instructions

**Scanner Configuration:**
```typescript
const config = {
  fps: 10, // Frames per second for scanning
  qrbox: { width: 300, height: 150 }, // Scanning box dimensions
  aspectRatio: 16 / 9, // Camera aspect ratio
};
```

**ISBN Extraction Logic:**
```typescript
function extractISBN(text: string): string | null {
  const digits = text.replace(/[^0-9]/g, '');
  
  // ISBN-13: 978xxxxxxxxxx or 979xxxxxxxxxx
  if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
    return digits;
  }
  
  // ISBN-10: 10 digits
  if (digits.length === 10) {
    return digits;
  }
  
  return null;
}
```

## API Endpoints

### GET /api/isbn/lookup

Lookup book information from ISBN using Open Library API.

**Query Parameters:**
- `isbn`: string - ISBN-10 or ISBN-13 (required)

**Request Example:**
```bash
GET /api/isbn/lookup?isbn=9780132350884
```

**Success Response (200):**
```json
{
  "success": true,
  "book": {
    "isbn": "9780132350884",
    "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
    "authors": "Robert C. Martin",
    "publisher": "Prentice Hall",
    "publicationYear": 2008,
    "pages": 464,
    "description": "Even bad code can function...",
    "coverImage": "https://covers.openlibrary.org/b/id/...",
    "subjects": ["Software engineering", "Programming"]
  }
}
```

**Not Found Response (404):**
```json
{
  "error": "Book not found",
  "message": "No book found with this ISBN. You can add it manually."
}
```

**Error Response (400/500):**
```json
{
  "error": "Invalid ISBN format",
  "details": "Must be 10 or 13 digits."
}
```

## ISBN Formats

### Library QR Code Format

**Content:** Plain text library ID (e.g., "00000001")
**Size:** Recommended 200x200 pixels minimum
**Error Correction:** Level H (high, 30% recovery)
**Usage:** Attached to physical books for quick scanning

**Example QR Code Data:**
```
00000001
```

**Generation:**
```tsx
import QRCode from 'qrcode.react';

<QRCode
  value={book.libraryId}
  size={200}
  level="H"
  includeMargin={true}
/>
```

**Best Practices:**
- Use high error correction (Level H) for durability
- Print on waterproof/tear-resistant labels
- Place on book spine or inside front cover
- Test scannability before mass printing
- Include human-readable library ID below QR code

### ISBN-13 (Recommended)

- **Format**: 978-X-XXX-XXXXX-X or 979-X-XXX-XXXXX-X
- **Length**: 13 digits
- **Example**: 978-0-13-235088-4
- **Prefix**: 978 (books) or 979 (future expansion)

### ISBN-10 (Legacy)

- **Format**: X-XXX-XXXXX-X
- **Length**: 10 digits (last digit can be X)
- **Example**: 0-13-235088-2
- **Note**: Gradually being phased out

## Open Library API

### API Information

- **Base URL**: `https://openlibrary.org/api/books`
- **Authentication**: None required (free public API)
- **Rate Limit**: No hard limit, but be considerate
- **Documentation**: https://openlibrary.org/dev/docs/api/books

### Request Format

```
https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data
```

**Parameters:**
- `bibkeys`: ISBN:{number} - Book identifier
- `format`: json - Response format
- `jscmd`: data - Return full data (vs. details)

### Response Structure

```json
{
  "ISBN:9780132350884": {
    "title": "Clean Code",
    "authors": [
      { "name": "Robert C. Martin" }
    ],
    "publishers": [
      { "name": "Prentice Hall" }
    ],
    "publish_date": "August 1, 2008",
    "number_of_pages": 464,
    "cover": {
      "small": "https://...",
      "medium": "https://...",
      "large": "https://..."
    },
    "subjects": [
      { "name": "Software engineering" }
    ]
  }
}
```

## Browser Compatibility

### Supported Browsers

- ✅ Chrome 53+ (Desktop & Mobile)
- ✅ Edge 79+
- ✅ Firefox 36+
- ✅ Safari 11+ (iOS 11+)
- ✅ Opera 40+

### Camera Requirements

- HTTPS connection (required for camera access)
- User permission for camera access
- Rear camera recommended for better barcode scanning
- Adequate lighting for barcode visibility

### Permission Prompts

**First-time users will see:**
1. Browser permission dialog: "Allow camera access?"
2. User must click "Allow" to proceed
3. Permission is remembered for future visits

**If denied:**
- Scanner shows error message
- User can manually enter ISBN instead
- Can reset permission in browser settings

## Troubleshooting

### Camera Not Accessible

**Error:** "Vui lòng cấp quyền truy cập camera để quét mã vạch."

**Solutions:**
1. Check browser camera permissions in settings
2. Ensure site is accessed via HTTPS (not HTTP)
3. Close other apps using the camera
4. Restart browser and try again
5. Use manual ISBN entry as fallback

### Barcode Not Scanning

**Issue:** Camera active but barcode not detected

**Solutions:**
1. Ensure adequate lighting
2. Hold camera steady and perpendicular to barcode
3. Adjust distance (15-30cm is optimal)
4. Clean camera lens
5. Try different angle or orientation
6. Ensure barcode is not damaged or faded

### Book Not Found

**Error:** "Không tìm thấy sách với ISBN này."

**Reasons:**
- Book not in Open Library database
- ISBN incorrect or damaged
- Book too new (not yet cataloged)
- Book too old (pre-ISBN era)

**Solutions:**
1. Double-check ISBN accuracy
2. Try searching by title/author instead
3. Enter book details manually
4. Use AI description generator for summary

### Wrong Book Information

**Issue:** Scanner finds different book than expected

**Solutions:**
1. Verify ISBN on book matches scanned number
2. Check if book has multiple ISBNs (paperback vs hardcover)
3. Manually correct information before saving
4. Report error to Open Library if data is incorrect

## Security & Privacy

### Camera Access

- Camera stream is processed locally in browser
- No images are uploaded to servers
- Camera access can be revoked at any time
- Permission is site-specific

### Data Privacy

- Open Library API does not require API key
- No personal data sent to external services
- Only ISBN is transmitted for lookup
- Book data is public domain information

## Performance Optimization

### Scanner Performance

```typescript
// Optimized settings for faster scanning
const config = {
  fps: 10, // Balance between speed and battery
  qrbox: { width: 300, height: 150 }, // Focused scanning area
  aspectRatio: 16 / 9, // Standard camera ratio
};
```

### API Caching

**Current:** No caching implemented

**Recommended Enhancement:**
```typescript
// Cache ISBN lookups to reduce API calls
const isbnCache = new Map<string, BookData>();

async function lookupISBN(isbn: string) {
  if (isbnCache.has(isbn)) {
    return isbnCache.get(isbn);
  }
  
  const data = await fetchFromAPI(isbn);
  isbnCache.set(isbn, data);
  return data;
}
```

## Alternative APIs

If Open Library API is unavailable, consider these alternatives:

### 1. Google Books API

- **URL**: `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`
- **Free**: 1,000 requests/day
- **Requires**: API key
- **Data Quality**: Excellent

### 2. ISBNdb API

- **URL**: `https://api2.isbndb.com/book/{isbn}`
- **Free Tier**: 500 requests/month
- **Requires**: API key
- **Data Quality**: Very good

### 3. OpenBD (Japan)

- **URL**: `https://api.openbd.jp/v1/get?isbn={isbn}`
- **Free**: Unlimited
- **Language**: Japanese books
- **Data Quality**: Good for Japanese titles

## Future Enhancements

- [ ] Support for EAN-13 barcodes (non-book products)
- [ ] QR code scanning for library IDs
- [ ] Batch scanning mode (multiple books)
- [ ] Offline ISBN database (for common books)
- [ ] Barcode scanning history
- [ ] Integration with multiple book APIs
- [ ] Cover image upload from camera
- [ ] Scan statistics and analytics

## Testing

### Manual Testing Steps

1. **Test Camera Permission:**
   ```
   Click "Quét ISBN" → Allow camera → Camera preview appears
   ```

2. **Test Barcode Scanning:**
   ```
   Point camera at ISBN barcode → Auto-detect → ISBN extracted
   ```

3. **Test API Lookup:**
   ```
   Scan valid ISBN → Book found → Form auto-filled
   Scan invalid ISBN → Not found message → Manual entry
   ```

4. **Test Error Handling:**
   ```
   Deny camera permission → Error message shown
   Poor lighting → Scanner struggles → Instructions helpful
   ```

### Test ISBNs

**Valid Examples:**
- 9780132350884 (Clean Code)
- 9780134685991 (Effective Java)
- 9781491950357 (Designing Data-Intensive Applications)
- 9780596517748 (JavaScript: The Good Parts)

**Invalid Examples:**
- 1234567890 (Invalid check digit)
- 0000000000000 (Non-existent)
- ABC123XYZ789 (Invalid format)

### API Testing

```bash
# Test valid ISBN
curl "https://openlibrary.org/api/books?bibkeys=ISBN:9780132350884&format=json&jscmd=data"

# Test invalid ISBN
curl "https://openlibrary.org/api/books?bibkeys=ISBN:0000000000&format=json&jscmd=data"

# Test local API endpoint
curl "http://localhost:3000/api/isbn/lookup?isbn=9780132350884"
```

## Dependencies

```json
{
  "html5-qrcode": "^2.3.8"
}
```

## Browser Console Logs

**Successful Scan:**
```
[BarcodeScanner] Detected: 9780132350884
[ISBNLookup] Fetching book data...
[ISBNLookup] Book found: Clean Code
[Form] Auto-filled with book data
```

**Failed Scan:**
```
[BarcodeScanner] Invalid barcode format: ABC123
[BarcodeScanner] Continuing scan...
```

## References

- [html5-qrcode Documentation](https://github.com/mebjas/html5-qrcode)
- [Open Library API](https://openlibrary.org/dev/docs/api/books)
- [ISBN Information](https://www.isbn.org/)
- [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)

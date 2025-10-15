import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/isbn/lookup - Lookup book details from ISBN
 * Uses Open Library API to fetch book information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');

    if (!isbn) {
      return NextResponse.json(
        { error: 'ISBN is required' },
        { status: 400 }
      );
    }

    // Clean ISBN (remove dashes and spaces)
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    // Validate ISBN format
    if (!/^(?:\d{10}|\d{13})$/.test(cleanISBN)) {
      return NextResponse.json(
        { error: 'Invalid ISBN format. Must be 10 or 13 digits.' },
        { status: 400 }
      );
    }

    // Fetch from Open Library API
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch book data from Open Library');
    }

    const data = await response.json();
    const bookKey = `ISBN:${cleanISBN}`;
    const bookData = data[bookKey];

    if (!bookData) {
      return NextResponse.json(
        { 
          error: 'Book not found',
          message: 'No book found with this ISBN. You can add it manually.',
        },
        { status: 404 }
      );
    }

    // Extract book information
    const bookInfo = {
      isbn: cleanISBN,
      title: bookData.title || '',
      authors: bookData.authors?.map((a: any) => a.name).join(', ') || '',
      publisher: bookData.publishers?.[0]?.name || '',
      publicationYear: bookData.publish_date 
        ? new Date(bookData.publish_date).getFullYear() 
        : null,
      pages: bookData.number_of_pages || null,
      description: bookData.notes || bookData.subtitle || '',
      coverImage: bookData.cover?.large || bookData.cover?.medium || bookData.cover?.small || '',
      subjects: bookData.subjects?.slice(0, 3).map((s: any) => s.name || s) || [],
    };

    return NextResponse.json({
      success: true,
      book: bookInfo,
    });
  } catch (error) {
    console.error('ISBN lookup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to lookup ISBN',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

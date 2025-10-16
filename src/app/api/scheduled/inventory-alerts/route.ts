import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Book } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Verify CRON secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load email alert settings
    const settingsDoc = await getDoc(doc(db, 'settings', 'emailAlerts'));
    if (!settingsDoc.exists() || !settingsDoc.data().enabled) {
      return NextResponse.json({ message: 'Email alerts disabled' });
    }

    const settings = settingsDoc.data();
    const { recipients, lowStockThreshold, damagedBookAlert, lostBookAlert, frequency } = settings;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ message: 'No recipients configured' });
    }

    // Check if we should send based on frequency
    const lastSent = settings.lastSent?.toDate();
    const now = new Date();
    
    if (lastSent && frequency !== 'immediate') {
      const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
      
      if (frequency === 'daily' && hoursSinceLastSent < 24) {
        return NextResponse.json({ message: 'Email already sent today' });
      }
      
      if (frequency === 'weekly' && hoursSinceLastSent < 168) { // 7 * 24 hours
        return NextResponse.json({ message: 'Email already sent this week' });
      }
    }

    // Get all books
    const booksSnapshot = await getDocs(collection(db, 'books'));
    const books = booksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Book[];

    // Get library settings for name
    const librarySettingsDoc = await getDoc(doc(db, 'settings', 'library'));
    const libraryName = librarySettingsDoc.exists() 
      ? librarySettingsDoc.data().libraryName || 'Thư viện Compass'
      : 'Thư viện Compass';

    const systemUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Analyze inventory issues
    const lowStockBooks = books.filter(book => 
      book.condition !== 'lost' && book.available <= lowStockThreshold
    );

    const damagedBooks = books.filter(book => book.condition === 'damaged');
    const lostBooks = books.filter(book => book.condition === 'lost');

    let emailsSent = 0;

    // Send low stock alert
    if (lowStockBooks.length > 0) {
      const bookList = lowStockBooks
        .sort((a, b) => a.available - b.available)
        .slice(0, 10) // Show top 10 most critical
        .map(book => 
          `• ${book.title} (${book.available}/${book.quantity} cuốn)${book.libraryId ? ` - Mã: ${book.libraryId}` : ''}`
        )
        .join('\n');

      for (const recipient of recipients) {
        try {
          const response = await fetch(`${systemUrl}/api/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'low-stock',
              to: recipient,
              data: {
                libraryName,
                recipientName: 'Thủ thư',
                count: lowStockBooks.length,
                threshold: lowStockThreshold,
                bookList: bookList + (lowStockBooks.length > 10 ? `\n... và ${lowStockBooks.length - 10} sách khác` : ''),
                systemUrl
              }
            }),
          });

          if (response.ok) {
            emailsSent++;
          }
        } catch (error) {
          console.error(`Failed to send low stock email to ${recipient}:`, error);
        }
      }
    }

    // Send damaged books alert
    if (damagedBookAlert && damagedBooks.length > 0) {
      const bookList = damagedBooks
        .slice(0, 10)
        .map(book => 
          `• ${book.title}${book.libraryId ? ` - Mã: ${book.libraryId}` : ''}`
        )
        .join('\n');

      for (const recipient of recipients) {
        try {
          const response = await fetch(`${systemUrl}/api/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'damaged',
              to: recipient,
              data: {
                libraryName,
                recipientName: 'Thủ thư',
                count: damagedBooks.length,
                bookList: bookList + (damagedBooks.length > 10 ? `\n... và ${damagedBooks.length - 10} sách khác` : ''),
                systemUrl
              }
            }),
          });

          if (response.ok) {
            emailsSent++;
          }
        } catch (error) {
          console.error(`Failed to send damaged books email to ${recipient}:`, error);
        }
      }
    }

    // Send lost books alert
    if (lostBookAlert && lostBooks.length > 0) {
      const bookList = lostBooks
        .slice(0, 10)
        .map(book => 
          `• ${book.title}${book.libraryId ? ` - Mã: ${book.libraryId}` : ''}`
        )
        .join('\n');

      for (const recipient of recipients) {
        try {
          const response = await fetch(`${systemUrl}/api/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'lost',
              to: recipient,
              data: {
                libraryName,
                recipientName: 'Thủ thư',
                count: lostBooks.length,
                bookList: bookList + (lostBooks.length > 10 ? `\n... và ${lostBooks.length - 10} sách khác` : ''),
                systemUrl
              }
            }),
          });

          if (response.ok) {
            emailsSent++;
          }
        } catch (error) {
          console.error(`Failed to send lost books email to ${recipient}:`, error);
        }
      }
    }

    // Update last sent timestamp
    if (emailsSent > 0) {
      await updateDoc(doc(db, 'settings', 'emailAlerts'), {
        lastSent: now
      });
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      summary: {
        lowStockBooks: lowStockBooks.length,
        damagedBooks: damagedBooks.length,
        lostBooks: lostBooks.length,
        recipients: recipients.length
      }
    });

  } catch (error) {
    console.error('Inventory alert job error:', error);
    return NextResponse.json(
      { error: 'Failed to process inventory alerts', details: error },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { notifyAvailableReservations } from '@/lib/notifications';

/**
 * API Route to notify users about available reservations
 * Can be triggered manually from admin panel or by external cron
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Sending reservation notifications...');
    const result = await notifyAvailableReservations();
    console.log('Reservation notifications result:', result);

    return NextResponse.json({
      success: true,
      message: 'Reservation notifications sent successfully',
      emailsSent: result.sent || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending reservation notifications:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send reservation notifications', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support GET for external cron services
export async function GET(request: NextRequest) {
  return POST(request);
}

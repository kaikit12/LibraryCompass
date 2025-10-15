import { NextRequest, NextResponse } from 'next/server';
import { sendOverdueNotices } from '@/lib/notifications';

/**
 * API Route to send overdue notices
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

    console.log('Sending overdue notices...');
    const result = await sendOverdueNotices();
    console.log('Overdue notices result:', result);

    return NextResponse.json({
      success: true,
      message: 'Overdue notices sent successfully',
      emailsSent: result.sent || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending overdue notices:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send overdue notices', 
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

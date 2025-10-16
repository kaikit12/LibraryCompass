import { NextRequest, NextResponse } from 'next/server';
import { sendDueReminders } from '@/lib/notifications';

/**
 * API Route to send due date reminders
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

    console.log('Sending due date reminders...');
    const result = await sendDueReminders();
    console.log('Due reminders result:', result);

    return NextResponse.json({
      success: true,
      message: 'Due date reminders sent successfully',
      emailsSent: result.count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending due reminders:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send due reminders', 
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

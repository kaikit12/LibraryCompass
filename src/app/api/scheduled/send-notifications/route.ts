import { NextRequest, NextResponse } from 'next/server';
import { sendDueReminders, sendOverdueNotices } from '@/lib/notifications';

/**
 * API Route to trigger scheduled email notifications
 * Can be called by a cron job service (e.g., Vercel Cron, GitHub Actions)
 * 
 * Example cron schedule:
 * - Daily at 9:00 AM: 0 9 * * *
 * 
 * Usage with Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/scheduled/send-notifications",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify request is from authorized source (optional)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting scheduled email notifications...');

    // Send due date reminders (3 days before)
    const dueRemindersResult = await sendDueReminders();
    console.log('Due reminders:', dueRemindersResult);

    // Send overdue notices
    const overdueNoticesResult = await sendOverdueNotices();
    console.log('Overdue notices:', overdueNoticesResult);

    return NextResponse.json({
      success: true,
      dueReminders: dueRemindersResult,
      overdueNotices: overdueNoticesResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in scheduled notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send scheduled notifications', details: error },
      { status: 500 }
    );
  }
}

// Allow manual trigger via POST (for testing)
export async function POST(request: NextRequest) {
  return GET(request);
}

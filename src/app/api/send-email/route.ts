import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  getDueReminderEmailTemplate,
  getOverdueEmailTemplate,
  getReservationReadyEmailTemplate,
  getAppointmentConfirmedEmailTemplate,
  getRenewalApprovedEmailTemplate,
} from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, data } = body;

    if (!to || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: to, type' },
        { status: 400 }
      );
    }

    let emailTemplate;

    switch (type) {
      case 'due-reminder':
        emailTemplate = getDueReminderEmailTemplate(data);
        break;
      case 'overdue':
        emailTemplate = getOverdueEmailTemplate(data);
        break;
      case 'reservation-ready':
        emailTemplate = getReservationReadyEmailTemplate(data);
        break;
      case 'appointment-confirmed':
        emailTemplate = getAppointmentConfirmedEmailTemplate(data);
        break;
      case 'renewal-approved':
        emailTemplate = getRenewalApprovedEmailTemplate(data);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    // Send email using Resend
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'LibraryCompass <onboarding@resend.dev>',
      to: [to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return NextResponse.json({
      success: true,
      messageId: response.data?.id,
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error },
      { status: 500 }
    );
  }
}

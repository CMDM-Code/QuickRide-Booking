import { NextRequest, NextResponse } from 'next/server';

/**
 * Email notification API stub (B6.3)
 * 
 * This endpoint accepts email notification requests and returns a success response.
 * In production, integrate with a transactional email service (SendGrid, Resend, etc.)
 * or Firebase Extensions for email delivery.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, templateData } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // Stub: log the email instead of sending
    console.log('[Email Notification]', {
      to,
      subject,
      message: message.slice(0, 200) + (message.length > 200 ? '...' : ''),
      templateData,
      sentAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Email queued for delivery (stub)',
      queuedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Email Notification] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

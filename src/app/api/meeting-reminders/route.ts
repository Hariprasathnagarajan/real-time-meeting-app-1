import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingReminders } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single reminder by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const reminder = await db.select()
        .from(meetingReminders)
        .where(and(
          eq(meetingReminders.id, parseInt(id)),
          eq(meetingReminders.userId, user.id)
        ))
        .limit(1);

      if (reminder.length === 0) {
        return NextResponse.json({ 
          error: 'Reminder not found',
          code: 'REMINDER_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(reminder[0], { status: 200 });
    }

    // List reminders with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const meetingId = searchParams.get('meetingId');
    const status = searchParams.get('status');
    const reminderType = searchParams.get('reminderType');

    let query = db.select().from(meetingReminders);

    // Build filter conditions
    const conditions = [eq(meetingReminders.userId, user.id)];

    if (meetingId) {
      conditions.push(eq(meetingReminders.meetingId, parseInt(meetingId)));
    }

    if (status) {
      conditions.push(eq(meetingReminders.status, status));
    }

    if (reminderType) {
      conditions.push(eq(meetingReminders.reminderType, reminderType));
    }

    query = query.where(and(...conditions));
    query = query.orderBy(desc(meetingReminders.scheduledFor));

    const reminders = await query.limit(limit).offset(offset);

    return NextResponse.json(reminders, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { meetingId, reminderType, scheduledFor, sentAt } = body;

    // Validate required fields
    if (!meetingId) {
      return NextResponse.json({ 
        error: "meetingId is required",
        code: "MISSING_MEETING_ID" 
      }, { status: 400 });
    }

    if (!reminderType) {
      return NextResponse.json({ 
        error: "reminderType is required",
        code: "MISSING_REMINDER_TYPE" 
      }, { status: 400 });
    }

    if (!scheduledFor) {
      return NextResponse.json({ 
        error: "scheduledFor is required",
        code: "MISSING_SCHEDULED_FOR" 
      }, { status: 400 });
    }

    // Validate reminderType enum
    const validReminderTypes = ['email', 'push', 'sms'];
    if (!validReminderTypes.includes(reminderType)) {
      return NextResponse.json({ 
        error: "reminderType must be one of: email, push, sms",
        code: "INVALID_REMINDER_TYPE" 
      }, { status: 400 });
    }

    // Validate meetingId is a valid integer
    if (isNaN(parseInt(meetingId))) {
      return NextResponse.json({ 
        error: "meetingId must be a valid integer",
        code: "INVALID_MEETING_ID" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newReminder = await db.insert(meetingReminders)
      .values({
        meetingId: parseInt(meetingId),
        userId: user.id,
        reminderType,
        scheduledFor,
        sentAt: sentAt || null,
        status: 'pending',
        createdAt: now,
      })
      .returning();

    return NextResponse.json(newReminder[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if reminder exists and belongs to user
    const existingReminder = await db.select()
      .from(meetingReminders)
      .where(and(
        eq(meetingReminders.id, parseInt(id)),
        eq(meetingReminders.userId, user.id)
      ))
      .limit(1);

    if (existingReminder.length === 0) {
      return NextResponse.json({ 
        error: 'Reminder not found',
        code: 'REMINDER_NOT_FOUND' 
      }, { status: 404 });
    }

    const { scheduledFor, sentAt, status, reminderType } = body;

    // Validate status enum if provided
    if (status) {
      const validStatuses = ['pending', 'sent', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: "status must be one of: pending, sent, failed",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
    }

    // Validate reminderType enum if provided
    if (reminderType) {
      const validReminderTypes = ['email', 'push', 'sms'];
      if (!validReminderTypes.includes(reminderType)) {
        return NextResponse.json({ 
          error: "reminderType must be one of: email, push, sms",
          code: "INVALID_REMINDER_TYPE" 
        }, { status: 400 });
      }
    }

    const updates: any = {};

    if (scheduledFor !== undefined) updates.scheduledFor = scheduledFor;
    if (sentAt !== undefined) updates.sentAt = sentAt;
    if (status !== undefined) updates.status = status;
    if (reminderType !== undefined) updates.reminderType = reminderType;

    const updatedReminder = await db.update(meetingReminders)
      .set(updates)
      .where(and(
        eq(meetingReminders.id, parseInt(id)),
        eq(meetingReminders.userId, user.id)
      ))
      .returning();

    if (updatedReminder.length === 0) {
      return NextResponse.json({ 
        error: 'Reminder not found',
        code: 'REMINDER_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(updatedReminder[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if reminder exists and belongs to user
    const existingReminder = await db.select()
      .from(meetingReminders)
      .where(and(
        eq(meetingReminders.id, parseInt(id)),
        eq(meetingReminders.userId, user.id)
      ))
      .limit(1);

    if (existingReminder.length === 0) {
      return NextResponse.json({ 
        error: 'Reminder not found',
        code: 'REMINDER_NOT_FOUND' 
      }, { status: 404 });
    }

    const deletedReminder = await db.delete(meetingReminders)
      .where(and(
        eq(meetingReminders.id, parseInt(id)),
        eq(meetingReminders.userId, user.id)
      ))
      .returning();

    if (deletedReminder.length === 0) {
      return NextResponse.json({ 
        error: 'Reminder not found',
        code: 'REMINDER_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Reminder deleted successfully',
      reminder: deletedReminder[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
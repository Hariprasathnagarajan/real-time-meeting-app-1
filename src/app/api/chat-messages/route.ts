import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages, meetings, user } from '@/db/schema';
import { eq, and, asc, gt, or, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const message = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, parseInt(id)))
        .limit(1);

      if (message.length === 0) {
        return NextResponse.json(
          { error: 'Chat message not found', code: 'MESSAGE_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(message[0], { status: 200 });
    }

    const meetingId = searchParams.get('meetingId');
    if (!meetingId || isNaN(parseInt(meetingId))) {
      return NextResponse.json(
        { error: 'Valid meetingId is required', code: 'INVALID_MEETING_ID' },
        { status: 400 }
      );
    }

    const currentUserId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sinceId = searchParams.get('sinceId');

    const conditions = [eq(chatMessages.meetingId, parseInt(meetingId))];

    if (sinceId && !isNaN(parseInt(sinceId))) {
      conditions.push(gt(chatMessages.id, parseInt(sinceId)));
    }

    if (currentUserId) {
      // See public messages, or private messages where user is sender or recipient
      conditions.push(
        or(
          isNull(chatMessages.recipientUserId),
          eq(chatMessages.recipientUserId, ''),
          eq(chatMessages.recipientUserId, currentUserId),
          eq(chatMessages.userId, currentUserId)
        )!
      );
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(asc(chatMessages.id))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, userId, senderName, recipientUserId, recipientName, message } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required', code: 'MISSING_MEETING_ID' },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(meetingId))) {
      return NextResponse.json(
        { error: 'Meeting ID must be a valid integer', code: 'INVALID_MEETING_ID' },
        { status: 400 }
      );
    }

    if (!senderName || typeof senderName !== 'string' || senderName.trim() === '') {
      return NextResponse.json(
        { error: 'Sender name is required', code: 'MISSING_SENDER_NAME' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required', code: 'MISSING_MESSAGE' },
        { status: 400 }
      );
    }

    const meetingExists = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, parseInt(meetingId)))
      .limit(1);

    if (meetingExists.length === 0) {
      return NextResponse.json(
        { error: 'Meeting not found', code: 'MEETING_NOT_FOUND' },
        { status: 400 }
      );
    }

    const newMessage = await db
      .insert(chatMessages)
      .values({
        meetingId: parseInt(meetingId),
        userId: userId || null,
        senderName: senderName.trim(),
        recipientUserId: recipientUserId || null,
        recipientName: recipientName || null,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newMessage[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

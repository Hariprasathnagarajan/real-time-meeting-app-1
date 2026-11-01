import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages, meetings, meetingParticipants } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, asc, gt, or, isNull } from 'drizzle-orm';

async function canChat(meetingId: number, userId: string) {
  const meeting = await db.select({ hostUserId: meetings.hostUserId }).from(meetings).where(eq(meetings.id, meetingId)).limit(1);
  if (!meeting[0]) return false;
  if (meeting[0].hostUserId === userId) return true;
  const member = await db.select({ id: meetingParticipants.id }).from(meetingParticipants).where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId), or(eq(meetingParticipants.status, 'admitted'), eq(meetingParticipants.status, 'in_meeting')))).limit(1);
  return member.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

      if (!(await canChat(message[0].meetingId, currentUser.id))) return NextResponse.json({ error: 'Meeting access denied' }, { status: 403 });
      return NextResponse.json(message[0], { status: 200 });
    }

    const meetingId = searchParams.get('meetingId');
    if (!meetingId || isNaN(parseInt(meetingId))) {
      return NextResponse.json(
        { error: 'Valid meetingId is required', code: 'INVALID_MEETING_ID' },
        { status: 400 }
      );
    }

    const currentUserId = currentUser.id;
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sinceId = searchParams.get('sinceId');

    if (!(await canChat(parseInt(meetingId), currentUser.id))) return NextResponse.json({ error: 'Meeting access denied' }, { status: 403 });

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
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const { meetingId, recipientUserId, recipientName, message } = body;

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

    if (!(await canChat(parseInt(meetingId), currentUser.id))) return NextResponse.json({ error: 'Meeting access denied' }, { status: 403 });

    const newMessage = await db
      .insert(chatMessages)
      .values({
        meetingId: parseInt(meetingId),
        userId: currentUser.id,
        senderName: currentUser.name,
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

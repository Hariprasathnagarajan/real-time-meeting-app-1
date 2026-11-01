import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetings, meetingParticipants, signalingMessages } from '@/db/schema';
import { and, eq, or, gt, lt, ne } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

async function canSignal(meetingCode: string, userId: string) {
  const meeting = await db.select({ id: meetings.id, hostUserId: meetings.hostUserId }).from(meetings).where(eq(meetings.meetingCode, meetingCode)).limit(1);
  if (!meeting[0]) return false;
  if (meeting[0].hostUserId === userId) return true;
  const participant = await db.select({ id: meetingParticipants.id }).from(meetingParticipants).where(and(
    eq(meetingParticipants.meetingId, meeting[0].id),
    eq(meetingParticipants.userId, userId),
    or(eq(meetingParticipants.status, 'admitted'), eq(meetingParticipants.status, 'in_meeting')),
  )).limit(1);
  return participant.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const meetingCode = searchParams.get('meetingCode');
    const participantId = searchParams.get('participantId');
    const sinceId = searchParams.get('sinceId');
    if (!meetingCode || !participantId || participantId !== currentUser.id) return NextResponse.json({ error: 'Invalid signaling identity' }, { status: 403 });
    if (!(await canSignal(meetingCode, currentUser.id))) return NextResponse.json({ error: 'Meeting access denied' }, { status: 403 });

    const conditions = [eq(signalingMessages.meetingCode, meetingCode), or(eq(signalingMessages.targetId, 'all'), eq(signalingMessages.targetId, participantId))!, ne(signalingMessages.senderId, participantId)];
    if (sinceId && !isNaN(parseInt(sinceId))) conditions.push(gt(signalingMessages.id, parseInt(sinceId)));
    const messages = await db.select().from(signalingMessages).where(and(...conditions)).orderBy(signalingMessages.id).limit(100);
    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error('Signal GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const { meetingCode, senderId, senderName, targetId, type, payload } = body;
    if (!meetingCode || !senderId || !type || senderId !== currentUser.id) return NextResponse.json({ error: 'Invalid signaling identity' }, { status: 403 });
    if (!(await canSignal(meetingCode, currentUser.id))) return NextResponse.json({ error: 'Meeting access denied' }, { status: 403 });
    if (!['join', 'offer', 'answer', 'candidate', 'state_change', 'leave'].includes(type)) return NextResponse.json({ error: 'Unsupported signaling event' }, { status: 400 });

    const result = await db.insert(signalingMessages).values({
      meetingCode,
      senderId: currentUser.id,
      senderName: currentUser.name,
      targetId: typeof targetId === 'string' ? targetId : 'all',
      type,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
      createdAt: new Date().toISOString(),
    }).returning();

    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      await db.delete(signalingMessages).where(lt(signalingMessages.createdAt, cutoff));
    }
    return NextResponse.json(result[0] ?? { success: true }, { status: 201 });
  } catch (error) {
    console.error('Signal POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

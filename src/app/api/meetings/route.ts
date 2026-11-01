import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { db } from '@/db';
import { meetings, meetingParticipants } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

function generateMeetingCode(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 9).toUpperCase();
}

function publicMeeting<T extends { passwordHash?: string | null }>(meeting: T) {
  const { passwordHash: _passwordHash, ...safeMeeting } = meeting;
  return safeMeeting;
}

async function getMeeting(id: number) {
  const result = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  return result[0] ?? null;
}

async function isMember(meetingId: number, userId: string) {
  const result = await db
    .select({ id: meetingParticipants.id })
    .from(meetingParticipants)
    .where(and(
      eq(meetingParticipants.meetingId, meetingId),
      eq(meetingParticipants.userId, userId),
      or(eq(meetingParticipants.status, 'admitted'), eq(meetingParticipants.status, 'in_meeting')),
    ))
    .limit(1);
  return result.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (code) {
      const result = await db.select().from(meetings).where(eq(meetings.meetingCode, code)).limit(1);
      const meeting = result[0];
      if (!meeting) return NextResponse.json({ error: 'Meeting not found', code: 'MEETING_NOT_FOUND' }, { status: 404 });
      if (meeting.hostUserId !== user.id && !(await isMember(meeting.id, user.id))) {
        return NextResponse.json({ error: 'Meeting access denied', code: 'MEETING_ACCESS_DENIED' }, { status: 403 });
      }
      return NextResponse.json(publicMeeting(meeting), { status: 200 });
    }

    const id = searchParams.get('id');
    if (id) {
      const meeting = await getMeeting(Number(id));
      if (!meeting) return NextResponse.json({ error: 'Meeting not found', code: 'MEETING_NOT_FOUND' }, { status: 404 });
      if (meeting.hostUserId !== user.id && !(await isMember(meeting.id, user.id))) {
        return NextResponse.json({ error: 'Meeting access denied', code: 'MEETING_ACCESS_DENIED' }, { status: 403 });
      }
      return NextResponse.json(publicMeeting(meeting), { status: 200 });
    }

    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const conditions = [eq(meetings.hostUserId, user.id)];
    if (search) conditions.push(or(like(meetings.title, `%${search}%`), like(meetings.description, `%${search}%`))!);
    if (status) conditions.push(eq(meetings.status, status));

    const results = await db.select().from(meetings).where(and(...conditions)).orderBy(desc(meetings.createdAt)).limit(limit).offset(offset);
    return NextResponse.json(results.map(publicMeeting), { status: 200 });
  } catch (error) {
    console.error('GET meetings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Instant Meeting';
    const rawPassword = typeof body.password === 'string' ? body.password.trim() : '';
    const now = new Date().toISOString();
    let meetingCode = generateMeetingCode();
    for (let attempts = 0; attempts < 10; attempts += 1) {
      const existing = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.meetingCode, meetingCode)).limit(1);
      if (!existing.length) break;
      meetingCode = generateMeetingCode();
    }

    const created = await db.insert(meetings).values({
      hostUserId: user.id,
      title,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      meetingCode,
      passwordHash: rawPassword ? await hash(rawPassword, 12) : null,
      scheduledStartTime: body.scheduledStartTime || now,
      scheduledEndTime: body.scheduledEndTime || null,
      actualStartTime: null,
      actualEndTime: null,
      isRecordingEnabled: body.isRecordingEnabled ?? false,
      isWaitingRoomEnabled: body.isWaitingRoomEnabled ?? false,
      isPasswordProtected: Boolean(rawPassword),
      isLocked: body.isLocked ?? false,
      allowScreenShare: body.allowScreenShare ?? true,
      allowChat: body.allowChat ?? true,
      allowUnmute: body.allowUnmute ?? true,
      allowVideo: body.allowVideo ?? true,
      allowRename: body.allowRename ?? true,
      maxParticipants: body.maxParticipants ?? 100,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(publicMeeting(created[0]), { status: 201 });
  } catch (error) {
    console.error('POST meeting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    const existing = await getMeeting(id);
    if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    if (existing.hostUserId !== user.id) return NextResponse.json({ error: 'Host permission required' }, { status: 403 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body.password !== undefined) {
      const rawPassword = String(body.password).trim();
      updates.passwordHash = rawPassword ? await hash(rawPassword, 12) : null;
      updates.isPasswordProtected = Boolean(rawPassword);
    }
    for (const key of ['scheduledStartTime', 'scheduledEndTime', 'isRecordingEnabled', 'isWaitingRoomEnabled', 'isLocked', 'allowScreenShare', 'allowChat', 'allowUnmute', 'allowVideo', 'allowRename', 'maxParticipants', 'status', 'actualStartTime', 'actualEndTime']) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const updated = await db.update(meetings).set(updates).where(eq(meetings.id, id)).returning();
    return NextResponse.json(publicMeeting(updated[0]), { status: 200 });
  } catch (error) {
    console.error('PUT meeting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    const existing = await getMeeting(id);
    if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    if (existing.hostUserId !== user.id) return NextResponse.json({ error: 'Host permission required' }, { status: 403 });
    await db.delete(meetings).where(eq(meetings.id, id));
    return NextResponse.json({ message: 'Meeting deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('DELETE meeting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

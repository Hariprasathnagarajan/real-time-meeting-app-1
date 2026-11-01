import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

function generateMeetingCode(): string {
  return Math.random().toString(36).substring(2, 11).toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (code) {
      const meeting = await db
        .select()
        .from(meetings)
        .where(eq(meetings.meetingCode, code))
        .limit(1);

      if (meeting.length === 0) {
        return NextResponse.json(
          { error: 'Meeting not found', code: 'MEETING_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(meeting[0], { status: 200 });
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = searchParams.get('id');
    if (id) {
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const meeting = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, parsedId))
        .limit(1);

      if (meeting.length === 0) {
        return NextResponse.json(
          { error: 'Meeting not found', code: 'MEETING_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(meeting[0], { status: 200 });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const hostUserId = searchParams.get('hostUserId');

    const conditions = [];

    if (hostUserId) {
      conditions.push(eq(meetings.hostUserId, hostUserId));
    }

    if (search) {
      conditions.push(
        or(
          like(meetings.title, `%${search}%`),
          like(meetings.description, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(meetings.status, status));
    }

    const results = await db
      .select()
      .from(meetings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(meetings.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      password,
      scheduledStartTime,
      scheduledEndTime,
      isRecordingEnabled,
      isWaitingRoomEnabled,
      isPasswordProtected,
      isLocked,
      allowScreenShare,
      allowChat,
      allowUnmute,
      allowVideo,
      allowRename,
      maxParticipants,
    } = body;

    const trimmedTitle = title?.trim() || 'Instant Meeting';
    let meetingCode = generateMeetingCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await db
        .select()
        .from(meetings)
        .where(eq(meetings.meetingCode, meetingCode))
        .limit(1);

      if (existing.length === 0) {
        isUnique = true;
      } else {
        meetingCode = generateMeetingCode();
        attempts++;
      }
    }

    const now = new Date().toISOString();
    const shouldBePasswordProtected = password
      ? true
      : isPasswordProtected || false;

    const newMeeting = await db
      .insert(meetings)
      .values({
        hostUserId: user.id,
        title: trimmedTitle,
        description: description?.trim() || null,
        meetingCode,
        password: password?.trim() || null,
        scheduledStartTime: scheduledStartTime || now,
        scheduledEndTime: scheduledEndTime || null,
        actualStartTime: null,
        actualEndTime: null,
        isRecordingEnabled: isRecordingEnabled ?? false,
        isWaitingRoomEnabled: isWaitingRoomEnabled ?? false,
        isPasswordProtected: shouldBePasswordProtected,
        isLocked: isLocked ?? false,
        allowScreenShare: allowScreenShare ?? true,
        allowChat: allowChat ?? true,
        allowUnmute: allowUnmute ?? true,
        allowVideo: allowVideo ?? true,
        allowRename: allowRename ?? true,
        maxParticipants: maxParticipants ?? 100,
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newMeeting[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id);
    const body = await request.json();

    const existing = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, parsedId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Meeting not found', code: 'MEETING_NOT_FOUND' },
        { status: 404 }
      );
    }

    const {
      title,
      description,
      password,
      scheduledStartTime,
      scheduledEndTime,
      isRecordingEnabled,
      isWaitingRoomEnabled,
      isPasswordProtected,
      isLocked,
      allowScreenShare,
      allowChat,
      allowUnmute,
      allowVideo,
      allowRename,
      maxParticipants,
      status,
      actualStartTime,
      actualEndTime,
    } = body;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (password !== undefined) {
      updates.password = password?.trim() || null;
      if (password) updates.isPasswordProtected = true;
    }
    if (scheduledStartTime !== undefined) updates.scheduledStartTime = scheduledStartTime;
    if (scheduledEndTime !== undefined) updates.scheduledEndTime = scheduledEndTime;
    if (isRecordingEnabled !== undefined) updates.isRecordingEnabled = isRecordingEnabled;
    if (isWaitingRoomEnabled !== undefined) updates.isWaitingRoomEnabled = isWaitingRoomEnabled;
    if (isPasswordProtected !== undefined) updates.isPasswordProtected = isPasswordProtected;
    if (isLocked !== undefined) updates.isLocked = isLocked;
    if (allowScreenShare !== undefined) updates.allowScreenShare = allowScreenShare;
    if (allowChat !== undefined) updates.allowChat = allowChat;
    if (allowUnmute !== undefined) updates.allowUnmute = allowUnmute;
    if (allowVideo !== undefined) updates.allowVideo = allowVideo;
    if (allowRename !== undefined) updates.allowRename = allowRename;
    if (maxParticipants !== undefined) updates.maxParticipants = maxParticipants;
    if (status !== undefined) updates.status = status;
    if (actualStartTime !== undefined) updates.actualStartTime = actualStartTime;
    if (actualEndTime !== undefined) updates.actualEndTime = actualEndTime;

    const updated = await db
      .update(meetings)
      .set(updates)
      .where(eq(meetings.id, parsedId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id);
    const deleted = await db
      .delete(meetings)
      .where(eq(meetings.id, parsedId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Meeting not found', code: 'MEETING_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Meeting deleted successfully', deletedMeeting: deleted[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

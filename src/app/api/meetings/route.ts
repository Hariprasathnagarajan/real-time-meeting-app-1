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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const meeting = await db.select()
        .from(meetings)
        .where(and(eq(meetings.id, parsedId), eq(meetings.hostUserId, user.id)))
        .limit(1);

      if (meeting.length === 0) {
        return NextResponse.json({ 
          error: 'Meeting not found',
          code: 'MEETING_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(meeting[0], { status: 200 });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const hostUserId = searchParams.get('hostUserId');

    let conditions = [eq(meetings.hostUserId, user.id)];

    if (search) {
      conditions.push(
        or(
          like(meetings.title, `%${search}%`),
          like(meetings.description, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(meetings.status, status));
    }

    if (hostUserId) {
      conditions.push(eq(meetings.hostUserId, hostUserId));
    }

    const results = await db.select()
      .from(meetings)
      .where(and(...conditions))
      .orderBy(desc(meetings.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
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

    if ('hostUserId' in body || 'host_user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
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
      maxParticipants
    } = body;

    if (!title || !scheduledStartTime) {
      return NextResponse.json({ 
        error: 'Title and scheduledStartTime are required',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return NextResponse.json({ 
        error: 'Title cannot be empty',
        code: 'INVALID_TITLE' 
      }, { status: 400 });
    }

    let meetingCode = generateMeetingCode();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const existing = await db.select()
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

    if (!isUnique) {
      return NextResponse.json({ 
        error: 'Failed to generate unique meeting code',
        code: 'CODE_GENERATION_FAILED' 
      }, { status: 500 });
    }

    const now = new Date().toISOString();
    
    const shouldBePasswordProtected = password ? true : (isPasswordProtected || false);

    const newMeeting = await db.insert(meetings)
      .values({
        hostUserId: user.id,
        title: trimmedTitle,
        description: description?.trim() || null,
        meetingCode,
        password: password?.trim() || null,
        scheduledStartTime,
        scheduledEndTime: scheduledEndTime || null,
        actualStartTime: null,
        actualEndTime: null,
        isRecordingEnabled: isRecordingEnabled ?? false,
        isWaitingRoomEnabled: isWaitingRoomEnabled ?? true,
        isPasswordProtected: shouldBePasswordProtected,
        maxParticipants: maxParticipants ?? 100,
        status: 'scheduled',
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newMeeting[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
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
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);

    const body = await request.json();

    if ('hostUserId' in body || 'host_user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const existing = await db.select()
      .from(meetings)
      .where(and(eq(meetings.id, parsedId), eq(meetings.hostUserId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Meeting not found',
        code: 'MEETING_NOT_FOUND' 
      }, { status: 404 });
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
      maxParticipants,
      status,
      actualStartTime,
      actualEndTime
    } = body;

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return NextResponse.json({ 
          error: 'Title cannot be empty',
          code: 'INVALID_TITLE' 
        }, { status: 400 });
      }
      updates.title = trimmedTitle;
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (password !== undefined) {
      updates.password = password?.trim() || null;
      if (password) {
        updates.isPasswordProtected = true;
      }
    }

    if (scheduledStartTime !== undefined) {
      updates.scheduledStartTime = scheduledStartTime;
    }

    if (scheduledEndTime !== undefined) {
      updates.scheduledEndTime = scheduledEndTime;
    }

    if (isRecordingEnabled !== undefined) {
      updates.isRecordingEnabled = isRecordingEnabled;
    }

    if (isWaitingRoomEnabled !== undefined) {
      updates.isWaitingRoomEnabled = isWaitingRoomEnabled;
    }

    if (isPasswordProtected !== undefined) {
      updates.isPasswordProtected = isPasswordProtected;
    }

    if (maxParticipants !== undefined) {
      updates.maxParticipants = maxParticipants;
    }

    if (status !== undefined) {
      updates.status = status;
    }

    if (actualStartTime !== undefined) {
      updates.actualStartTime = actualStartTime;
    }

    if (actualEndTime !== undefined) {
      updates.actualEndTime = actualEndTime;
    }

    const updated = await db.update(meetings)
      .set(updates)
      .where(and(eq(meetings.id, parsedId), eq(meetings.hostUserId, user.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Meeting not found',
        code: 'MEETING_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
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
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);

    const existing = await db.select()
      .from(meetings)
      .where(and(eq(meetings.id, parsedId), eq(meetings.hostUserId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Meeting not found',
        code: 'MEETING_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(meetings)
      .where(and(eq(meetings.id, parsedId), eq(meetings.hostUserId, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Meeting not found',
        code: 'MEETING_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Meeting deleted successfully',
      deletedMeeting: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
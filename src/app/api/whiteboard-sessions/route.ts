import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whiteboardSessions, meetings, user } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single whiteboard session by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const session = await db
        .select()
        .from(whiteboardSessions)
        .where(eq(whiteboardSessions.id, parseInt(id)))
        .limit(1);

      if (session.length === 0) {
        return NextResponse.json(
          { error: 'Whiteboard session not found', code: 'SESSION_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(session[0], { status: 200 });
    }

    // List whiteboard sessions with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const meetingId = searchParams.get('meetingId');

    let query = db.select().from(whiteboardSessions).orderBy(desc(whiteboardSessions.updatedAt)).$dynamic().$dynamic();

    // Filter by meetingId if provided
    if (meetingId) {
      if (isNaN(parseInt(meetingId))) {
        return NextResponse.json(
          { error: 'Valid meeting ID is required', code: 'INVALID_MEETING_ID' },
          { status: 400 }
        );
      }
      query = query.where(eq(whiteboardSessions.meetingId, parseInt(meetingId)));
    }

    const sessions = await query.limit(limit).offset(offset);

    return NextResponse.json(sessions, { status: 200 });
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
    const { meetingId, whiteboardData, lastUpdatedByUserId } = body;

    // Validate required fields
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required', code: 'MISSING_MEETING_ID' },
        { status: 400 }
      );
    }

    if (!whiteboardData) {
      return NextResponse.json(
        { error: 'Whiteboard data is required', code: 'MISSING_WHITEBOARD_DATA' },
        { status: 400 }
      );
    }

    // Validate meetingId is a valid integer
    if (isNaN(parseInt(meetingId))) {
      return NextResponse.json(
        { error: 'Meeting ID must be a valid integer', code: 'INVALID_MEETING_ID' },
        { status: 400 }
      );
    }

    // Validate whiteboardData is valid JSON
    if (typeof whiteboardData !== 'object' || whiteboardData === null) {
      return NextResponse.json(
        { error: 'Whiteboard data must be a valid JSON object', code: 'INVALID_WHITEBOARD_DATA' },
        { status: 400 }
      );
    }

    // Validate meeting exists
    const meeting = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, parseInt(meetingId)))
      .limit(1);

    if (meeting.length === 0) {
      return NextResponse.json(
        { error: 'Meeting not found', code: 'MEETING_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Validate lastUpdatedByUserId if provided
    if (lastUpdatedByUserId) {
      const userRecord = await db
        .select()
        .from(user)
        .where(eq(user.id, lastUpdatedByUserId))
        .limit(1);

      if (userRecord.length === 0) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();

    const newSession = await db
      .insert(whiteboardSessions)
      .values({
        meetingId: parseInt(meetingId),
        whiteboardData: JSON.stringify(whiteboardData),
        lastUpdatedByUserId: lastUpdatedByUserId || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Parse the JSON string back to object for response
    const response = {
      ...newSession[0],
      whiteboardData: JSON.parse(newSession[0].whiteboardData as string),
    };

    return NextResponse.json(response, { status: 201 });
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if session exists
    const existingSession = await db
      .select()
      .from(whiteboardSessions)
      .where(eq(whiteboardSessions.id, parseInt(id)))
      .limit(1);

    if (existingSession.length === 0) {
      return NextResponse.json(
        { error: 'Whiteboard session not found', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { whiteboardData, lastUpdatedByUserId } = body;

    // Validate whiteboardData if provided
    if (whiteboardData !== undefined) {
      if (typeof whiteboardData !== 'object' || whiteboardData === null) {
        return NextResponse.json(
          { error: 'Whiteboard data must be a valid JSON object', code: 'INVALID_WHITEBOARD_DATA' },
          { status: 400 }
        );
      }
    }

    // Validate lastUpdatedByUserId if provided
    if (lastUpdatedByUserId !== undefined && lastUpdatedByUserId !== null) {
      const userRecord = await db
        .select()
        .from(user)
        .where(eq(user.id, lastUpdatedByUserId))
        .limit(1);

      if (userRecord.length === 0) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 400 }
        );
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (whiteboardData !== undefined) {
      updates.whiteboardData = JSON.stringify(whiteboardData);
    }

    if (lastUpdatedByUserId !== undefined) {
      updates.lastUpdatedByUserId = lastUpdatedByUserId;
    }

    const updatedSession = await db
      .update(whiteboardSessions)
      .set(updates)
      .where(eq(whiteboardSessions.id, parseInt(id)))
      .returning();

    // Parse the JSON string back to object for response
    const response = {
      ...updatedSession[0],
      whiteboardData: JSON.parse(updatedSession[0].whiteboardData as string),
    };

    return NextResponse.json(response, { status: 200 });
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if session exists
    const existingSession = await db
      .select()
      .from(whiteboardSessions)
      .where(eq(whiteboardSessions.id, parseInt(id)))
      .limit(1);

    if (existingSession.length === 0) {
      return NextResponse.json(
        { error: 'Whiteboard session not found', code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(whiteboardSessions)
      .where(eq(whiteboardSessions.id, parseInt(id)))
      .returning();

    // Parse the JSON string back to object for response
    const response = {
      ...deleted[0],
      whiteboardData: JSON.parse(deleted[0].whiteboardData as string),
    };

    return NextResponse.json(
      {
        message: 'Whiteboard session deleted successfully',
        deletedSession: response,
      },
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
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt';
import { db } from '@/db';
import { meetingParticipants, meetings } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single participant by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const participant = await db
        .select()
        .from(meetingParticipants)
        .where(eq(meetingParticipants.id, parseInt(id)))
        .limit(1);

      if (participant.length === 0) {
        return NextResponse.json(
          { error: 'Participant not found', code: 'PARTICIPANT_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(participant[0], { status: 200 });
    }

    // List participants with filtering and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const meetingId = searchParams.get('meetingId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const role = searchParams.get('role');

    // Build where conditions
    const conditions = [];
    
    if (meetingId) {
      if (isNaN(parseInt(meetingId))) {
        return NextResponse.json(
          { error: 'Valid meetingId is required', code: 'INVALID_MEETING_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(meetingParticipants.meetingId, parseInt(meetingId)));
    }

    if (userId) {
      conditions.push(eq(meetingParticipants.userId, userId));
    }

    if (status) {
      conditions.push(eq(meetingParticipants.status, status));
    }

    if (role) {
      conditions.push(eq(meetingParticipants.role, role));
    }

    const participants = await db
      .select()
      .from(meetingParticipants)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(meetingParticipants.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(participants, { status: 200 });
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
    const { meetingId, displayName, passcode } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'meetingId is required', code: 'MISSING_MEETING_ID' },
        { status: 400 }
      );
    }

    if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
      return NextResponse.json(
        { error: 'displayName is required', code: 'MISSING_DISPLAY_NAME' },
        { status: 400 }
      );
    }

    const meeting = await db.select().from(meetings).where(eq(meetings.id, parseInt(meetingId))).limit(1);
    if (!meeting[0]) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    if (meeting[0].passwordHash && (!passcode || !(await compare(String(passcode), meeting[0].passwordHash)))) {
      return NextResponse.json({ error: 'Incorrect meeting passcode', code: 'INVALID_PASSCODE' }, { status: 403 });
    }

    const assignedRole = meeting[0].hostUserId === currentUser.id ? 'host' : 'participant';
    const now = new Date().toISOString();
    const newParticipant = await db
      .insert(meetingParticipants)
      .values({
        meetingId: parseInt(meetingId),
        userId: currentUser.id,
        displayName: displayName.trim(),
        role: assignedRole,
        status: 'waiting',
        isAudioMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isHandRaised: false,
        createdAt: now,
      })
      .returning();

    return NextResponse.json(newParticipant[0], { status: 201 });
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

    const existingParticipant = await db
      .select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.id, parseInt(id)))
      .limit(1);

    if (existingParticipant.length === 0) {
      return NextResponse.json(
        { error: 'Participant not found', code: 'PARTICIPANT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, role, displayName, isAudioMuted, isVideoOff, isScreenSharing, isHandRaised, joinedAt, leftAt } = body;

    const validStatuses = ['waiting', 'admitted', 'in_meeting', 'left', 'removed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: waiting, admitted, in_meeting, left, removed', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const validRoles = ['host', 'co_host', 'participant', 'guest'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: host, co_host, participant, guest', code: 'INVALID_ROLE' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (isAudioMuted !== undefined) updateData.isAudioMuted = isAudioMuted;
    if (isVideoOff !== undefined) updateData.isVideoOff = isVideoOff;
    if (isScreenSharing !== undefined) updateData.isScreenSharing = isScreenSharing;
    if (isHandRaised !== undefined) updateData.isHandRaised = isHandRaised;
    if (joinedAt !== undefined) updateData.joinedAt = joinedAt;
    if (leftAt !== undefined) updateData.leftAt = leftAt;

    const updatedParticipant = await db
      .update(meetingParticipants)
      .set(updateData)
      .where(eq(meetingParticipants.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedParticipant[0], { status: 200 });
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

    const existingParticipant = await db
      .select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.id, parseInt(id)))
      .limit(1);

    if (existingParticipant.length === 0) {
      return NextResponse.json(
        { error: 'Participant not found', code: 'PARTICIPANT_NOT_FOUND' },
        { status: 404 }
      );
    }

    await db
      .delete(meetingParticipants)
      .where(eq(meetingParticipants.id, parseInt(id)));

    return NextResponse.json(
      { message: 'Participant removed successfully' },
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

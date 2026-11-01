import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { breakoutRooms } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId || isNaN(parseInt(meetingId))) {
      return NextResponse.json(
        { error: 'Valid meetingId is required' },
        { status: 400 }
      );
    }

    const rooms = await db
      .select()
      .from(breakoutRooms)
      .where(eq(breakoutRooms.meetingId, parseInt(meetingId)));

    return NextResponse.json(rooms, { status: 200 });
  } catch (error) {
    console.error('Breakout rooms GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, rooms } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'meetingId is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (Array.isArray(rooms)) {
      // Clear existing rooms first
      await db
        .delete(breakoutRooms)
        .where(eq(breakoutRooms.meetingId, parseInt(meetingId)));

      const inserted = [];
      for (const r of rooms) {
        const res = await db
          .insert(breakoutRooms)
          .values({
            meetingId: parseInt(meetingId),
            name: r.name,
            assignedParticipantIds: r.assignedParticipantIds || [],
            status: r.status || 'open',
            createdAt: now,
          })
          .returning();
        inserted.push(res[0]);
      }
      return NextResponse.json(inserted, { status: 201 });
    }

    const res = await db
      .insert(breakoutRooms)
      .values({
        meetingId: parseInt(meetingId),
        name: body.name,
        assignedParticipantIds: body.assignedParticipantIds || [],
        status: body.status || 'closed',
        createdAt: now,
      })
      .returning();

    return NextResponse.json(res[0], { status: 201 });
  } catch (error) {
    console.error('Breakout rooms POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const meetingId = searchParams.get('meetingId');
    const body = await request.json();

    if (meetingId && body.action === 'close_all') {
      await db
        .update(breakoutRooms)
        .set({ status: 'closed' })
        .where(eq(breakoutRooms.meetingId, parseInt(meetingId)));
      return NextResponse.json({ success: true, message: 'All breakout rooms closed' });
    }

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const updated = await db
      .update(breakoutRooms)
      .set(body)
      .where(eq(breakoutRooms.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('Breakout rooms PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const id = searchParams.get('id');

    if (id) {
      await db.delete(breakoutRooms).where(eq(breakoutRooms.id, parseInt(id)));
      return NextResponse.json({ success: true });
    }

    if (meetingId) {
      await db
        .delete(breakoutRooms)
        .where(eq(breakoutRooms.meetingId, parseInt(meetingId)));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'id or meetingId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Breakout rooms DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

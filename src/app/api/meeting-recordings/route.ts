import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingRecordings } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record fetch by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const recording = await db
        .select()
        .from(meetingRecordings)
        .where(eq(meetingRecordings.id, parseInt(id)))
        .limit(1);

      if (recording.length === 0) {
        return NextResponse.json(
          { error: 'Recording not found', code: 'RECORDING_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(recording[0], { status: 200 });
    }

    // List with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const meetingId = searchParams.get('meetingId');
    const status = searchParams.get('status');
    const recordingType = searchParams.get('recordingType');

    let query = db.select().from(meetingRecordings).$dynamic().$dynamic();

    // Build filter conditions
    const conditions = [];
    if (meetingId) {
      const meetingIdNum = parseInt(meetingId);
      if (!isNaN(meetingIdNum)) {
        conditions.push(eq(meetingRecordings.meetingId, meetingIdNum));
      }
    }
    if (status) {
      conditions.push(eq(meetingRecordings.status, status));
    }
    if (recordingType) {
      conditions.push(eq(meetingRecordings.recordingType, recordingType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const recordings = await query
      .orderBy(desc(meetingRecordings.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(recordings, { status: 200 });
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
    const {
      meetingId,
      fileUrl,
      fileSizeMb,
      durationMinutes,
      recordingType,
      startedAt,
      transcriptionText,
      completedAt,
    } = body;

    // Validate required fields
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required', code: 'MISSING_MEETING_ID' },
        { status: 400 }
      );
    }

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required', code: 'MISSING_FILE_URL' },
        { status: 400 }
      );
    }

    if (fileSizeMb === undefined || fileSizeMb === null) {
      return NextResponse.json(
        { error: 'File size is required', code: 'MISSING_FILE_SIZE' },
        { status: 400 }
      );
    }

    if (durationMinutes === undefined || durationMinutes === null) {
      return NextResponse.json(
        { error: 'Duration is required', code: 'MISSING_DURATION' },
        { status: 400 }
      );
    }

    if (!recordingType) {
      return NextResponse.json(
        { error: 'Recording type is required', code: 'MISSING_RECORDING_TYPE' },
        { status: 400 }
      );
    }

    if (!startedAt) {
      return NextResponse.json(
        { error: 'Started at timestamp is required', code: 'MISSING_STARTED_AT' },
        { status: 400 }
      );
    }

    // Validate numeric fields are positive
    if (fileSizeMb <= 0) {
      return NextResponse.json(
        { error: 'File size must be a positive number', code: 'INVALID_FILE_SIZE' },
        { status: 400 }
      );
    }

    if (durationMinutes <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number', code: 'INVALID_DURATION' },
        { status: 400 }
      );
    }

    // Validate recordingType enum
    const validRecordingTypes = ['video', 'audio', 'screen'];
    if (!validRecordingTypes.includes(recordingType)) {
      return NextResponse.json(
        {
          error: 'Recording type must be one of: video, audio, screen',
          code: 'INVALID_RECORDING_TYPE',
        },
        { status: 400 }
      );
    }

    // Prepare insert data with defaults
    const insertData = {
      meetingId: parseInt(meetingId),
      fileUrl: fileUrl.trim(),
      fileSizeMb,
      durationMinutes,
      recordingType,
      startedAt,
      transcriptionText: transcriptionText || null,
      completedAt: completedAt || null,
      status: 'processing',
      createdAt: new Date().toISOString(),
    };

    const newRecording = await db
      .insert(meetingRecordings)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecording[0], { status: 201 });
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

    const recordingId = parseInt(id);

    // Check if recording exists
    const existing = await db
      .select()
      .from(meetingRecordings)
      .where(eq(meetingRecordings.id, recordingId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Recording not found', code: 'RECORDING_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      fileUrl,
      fileSizeMb,
      durationMinutes,
      transcriptionText,
      status,
      completedAt,
    } = body;

    // Validate numeric fields if provided
    if (fileSizeMb !== undefined && fileSizeMb !== null && fileSizeMb <= 0) {
      return NextResponse.json(
        { error: 'File size must be a positive number', code: 'INVALID_FILE_SIZE' },
        { status: 400 }
      );
    }

    if (durationMinutes !== undefined && durationMinutes !== null && durationMinutes <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number', code: 'INVALID_DURATION' },
        { status: 400 }
      );
    }

    // Validate status enum if provided
    if (status) {
      const validStatuses = ['processing', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Status must be one of: processing, completed, failed',
            code: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updates: any = {};

    if (fileUrl !== undefined) updates.fileUrl = fileUrl.trim();
    if (fileSizeMb !== undefined) updates.fileSizeMb = fileSizeMb;
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
    if (transcriptionText !== undefined) updates.transcriptionText = transcriptionText;
    if (status !== undefined) updates.status = status;
    if (completedAt !== undefined) updates.completedAt = completedAt;

    const updated = await db
      .update(meetingRecordings)
      .set(updates)
      .where(eq(meetingRecordings.id, recordingId))
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const recordingId = parseInt(id);

    // Check if recording exists
    const existing = await db
      .select()
      .from(meetingRecordings)
      .where(eq(meetingRecordings.id, recordingId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Recording not found', code: 'RECORDING_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(meetingRecordings)
      .where(eq(meetingRecordings.id, recordingId))
      .returning();

    return NextResponse.json(
      {
        message: 'Recording deleted successfully',
        recording: deleted[0],
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
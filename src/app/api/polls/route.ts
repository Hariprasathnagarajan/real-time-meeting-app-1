import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { polls } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single poll by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const poll = await db
        .select()
        .from(polls)
        .where(eq(polls.id, parseInt(id)))
        .limit(1);

      if (poll.length === 0) {
        return NextResponse.json(
          { error: 'Poll not found', code: 'POLL_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(poll[0], { status: 200 });
    }

    // List polls with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const meetingId = searchParams.get('meetingId');
    const createdByUserId = searchParams.get('createdByUserId');
    const isActive = searchParams.get('isActive');

    let query = db.select().from(polls).$dynamic().$dynamic();

    // Build WHERE conditions
    const conditions = [];
    
    if (meetingId) {
      if (isNaN(parseInt(meetingId))) {
        return NextResponse.json(
          { error: 'Valid meetingId is required', code: 'INVALID_MEETING_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(polls.meetingId, parseInt(meetingId)));
    }

    if (createdByUserId) {
      conditions.push(eq(polls.createdByUserId, createdByUserId));
    }

    if (isActive !== null && isActive !== undefined) {
      const isActiveBoolean = isActive === 'true';
      conditions.push(eq(polls.isActive, isActiveBoolean));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(polls.createdAt))
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
    const body = await request.json();
    const { meetingId, createdByUserId, question, pollType, options, isAnonymous, isActive, endsAt } = body;

    // Validate required fields
    if (!meetingId) {
      return NextResponse.json(
        { error: 'meetingId is required', code: 'MISSING_MEETING_ID' },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(meetingId))) {
      return NextResponse.json(
        { error: 'Valid meetingId is required', code: 'INVALID_MEETING_ID' },
        { status: 400 }
      );
    }

    if (!createdByUserId || typeof createdByUserId !== 'string' || createdByUserId.trim() === '') {
      return NextResponse.json(
        { error: 'createdByUserId is required', code: 'MISSING_CREATED_BY_USER_ID' },
        { status: 400 }
      );
    }

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return NextResponse.json(
        { error: 'question is required', code: 'MISSING_QUESTION' },
        { status: 400 }
      );
    }

    if (!pollType || typeof pollType !== 'string' || pollType.trim() === '') {
      return NextResponse.json(
        { error: 'pollType is required', code: 'MISSING_POLL_TYPE' },
        { status: 400 }
      );
    }

    // Validate pollType enum
    const validPollTypes = ['multiple_choice', 'yes_no', 'rating'];
    if (!validPollTypes.includes(pollType)) {
      return NextResponse.json(
        { error: 'pollType must be one of: multiple_choice, yes_no, rating', code: 'INVALID_POLL_TYPE' },
        { status: 400 }
      );
    }

    if (!options) {
      return NextResponse.json(
        { error: 'options is required', code: 'MISSING_OPTIONS' },
        { status: 400 }
      );
    }

    // Validate options is valid JSON (array or object)
    let parsedOptions;
    try {
      if (typeof options === 'string') {
        parsedOptions = JSON.parse(options);
      } else if (typeof options === 'object') {
        parsedOptions = options;
      } else {
        throw new Error('Options must be a valid JSON array or object');
      }

      if (!Array.isArray(parsedOptions) && typeof parsedOptions !== 'object') {
        throw new Error('Options must be a valid JSON array or object');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'options must be valid JSON (array or object)', code: 'INVALID_OPTIONS_JSON' },
        { status: 400 }
      );
    }

    // Prepare insert data with defaults
    const insertData = {
      meetingId: parseInt(meetingId),
      createdByUserId: createdByUserId.trim(),
      question: question.trim(),
      pollType: pollType.trim(),
      options: parsedOptions,
      isAnonymous: isAnonymous !== undefined ? Boolean(isAnonymous) : true,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      endsAt: endsAt || null,
      createdAt: new Date().toISOString(),
    };

    const newPoll = await db.insert(polls).values(insertData).returning();

    return NextResponse.json(newPoll[0], { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { question, options, isAnonymous, isActive, endsAt } = body;

    // Check if poll exists
    const existingPoll = await db
      .select()
      .from(polls)
      .where(eq(polls.id, parseInt(id)))
      .limit(1);

    if (existingPoll.length === 0) {
      return NextResponse.json(
        { error: 'Poll not found', code: 'POLL_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (question !== undefined) {
      if (typeof question !== 'string' || question.trim() === '') {
        return NextResponse.json(
          { error: 'question must be a non-empty string', code: 'INVALID_QUESTION' },
          { status: 400 }
        );
      }
      updateData.question = question.trim();
    }

    if (options !== undefined) {
      // Validate options is valid JSON (array or object)
      let parsedOptions;
      try {
        if (typeof options === 'string') {
          parsedOptions = JSON.parse(options);
        } else if (typeof options === 'object') {
          parsedOptions = options;
        } else {
          throw new Error('Options must be a valid JSON array or object');
        }

        if (!Array.isArray(parsedOptions) && typeof parsedOptions !== 'object') {
          throw new Error('Options must be a valid JSON array or object');
        }
        
        updateData.options = parsedOptions;
      } catch (error) {
        return NextResponse.json(
          { error: 'options must be valid JSON (array or object)', code: 'INVALID_OPTIONS_JSON' },
          { status: 400 }
        );
      }
    }

    if (isAnonymous !== undefined) {
      updateData.isAnonymous = Boolean(isAnonymous);
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (endsAt !== undefined) {
      updateData.endsAt = endsAt;
    }

    const updated = await db
      .update(polls)
      .set(updateData)
      .where(eq(polls.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Poll not found', code: 'POLL_NOT_FOUND' },
        { status: 404 }
      );
    }

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if poll exists
    const existingPoll = await db
      .select()
      .from(polls)
      .where(eq(polls.id, parseInt(id)))
      .limit(1);

    if (existingPoll.length === 0) {
      return NextResponse.json(
        { error: 'Poll not found', code: 'POLL_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(polls)
      .where(eq(polls.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Poll deleted successfully',
        poll: deleted[0],
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
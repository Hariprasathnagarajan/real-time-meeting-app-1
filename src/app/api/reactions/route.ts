import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reactions, meetings, user } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const VALID_REACTION_TYPES = ['thumbs_up', 'heart', 'clap', 'laugh', 'thinking'] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single reaction by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const reaction = await db
        .select()
        .from(reactions)
        .where(eq(reactions.id, parseInt(id)))
        .limit(1);

      if (reaction.length === 0) {
        return NextResponse.json(
          { error: 'Reaction not found', code: 'REACTION_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(reaction[0], { status: 200 });
    }

    // List reactions with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const meetingId = searchParams.get('meetingId');
    const userId = searchParams.get('userId');
    const reactionType = searchParams.get('reactionType');

    let query = db.select().from(reactions);

    // Build filter conditions
    const conditions = [];
    
    if (meetingId) {
      if (isNaN(parseInt(meetingId))) {
        return NextResponse.json(
          { error: 'Valid meeting ID is required', code: 'INVALID_MEETING_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(reactions.meetingId, parseInt(meetingId)));
    }

    if (userId) {
      conditions.push(eq(reactions.userId, userId));
    }

    if (reactionType) {
      if (!VALID_REACTION_TYPES.includes(reactionType as any)) {
        return NextResponse.json(
          { 
            error: `Invalid reaction type. Must be one of: ${VALID_REACTION_TYPES.join(', ')}`, 
            code: 'INVALID_REACTION_TYPE' 
          },
          { status: 400 }
        );
      }
      conditions.push(eq(reactions.reactionType, reactionType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(reactions.createdAt))
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
    const { meetingId, userId, reactionType } = body;

    // Validate required fields
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required', code: 'MISSING_MEETING_ID' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!reactionType) {
      return NextResponse.json(
        { error: 'Reaction type is required', code: 'MISSING_REACTION_TYPE' },
        { status: 400 }
      );
    }

    // Validate meeting ID is a number
    if (isNaN(parseInt(meetingId))) {
      return NextResponse.json(
        { error: 'Meeting ID must be a valid integer', code: 'INVALID_MEETING_ID' },
        { status: 400 }
      );
    }

    // Validate reaction type
    if (!VALID_REACTION_TYPES.includes(reactionType)) {
      return NextResponse.json(
        { 
          error: `Invalid reaction type. Must be one of: ${VALID_REACTION_TYPES.join(', ')}`, 
          code: 'INVALID_REACTION_TYPE' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedUserId = userId.trim();
    const sanitizedReactionType = reactionType.trim();

    // Verify meeting exists
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

    // Verify user exists
    const userExists = await db
      .select()
      .from(user)
      .where(eq(user.id, sanitizedUserId))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Create reaction
    const newReaction = await db
      .insert(reactions)
      .values({
        meetingId: parseInt(meetingId),
        userId: sanitizedUserId,
        reactionType: sanitizedReactionType,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newReaction[0], { status: 201 });
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
    const { reactionType } = body;

    // Validate reaction type if provided
    if (reactionType && !VALID_REACTION_TYPES.includes(reactionType)) {
      return NextResponse.json(
        { 
          error: `Invalid reaction type. Must be one of: ${VALID_REACTION_TYPES.join(', ')}`, 
          code: 'INVALID_REACTION_TYPE' 
        },
        { status: 400 }
      );
    }

    // Check if reaction exists
    const existingReaction = await db
      .select()
      .from(reactions)
      .where(eq(reactions.id, parseInt(id)))
      .limit(1);

    if (existingReaction.length === 0) {
      return NextResponse.json(
        { error: 'Reaction not found', code: 'REACTION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {};
    
    if (reactionType) {
      updates.reactionType = reactionType.trim();
    }

    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existingReaction[0], { status: 200 });
    }

    // Update reaction
    const updatedReaction = await db
      .update(reactions)
      .set(updates)
      .where(eq(reactions.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedReaction[0], { status: 200 });
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

    // Check if reaction exists
    const existingReaction = await db
      .select()
      .from(reactions)
      .where(eq(reactions.id, parseInt(id)))
      .limit(1);

    if (existingReaction.length === 0) {
      return NextResponse.json(
        { error: 'Reaction not found', code: 'REACTION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete reaction
    const deletedReaction = await db
      .delete(reactions)
      .where(eq(reactions.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Reaction deleted successfully',
        reaction: deletedReaction[0],
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
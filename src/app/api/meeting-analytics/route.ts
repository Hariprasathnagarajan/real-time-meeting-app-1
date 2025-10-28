import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingAnalytics } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(meetingAnalytics)
        .where(eq(meetingAnalytics.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Analytics record not found',
          code: "ANALYTICS_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const meetingId = searchParams.get('meetingId');

    let query = db.select().from(meetingAnalytics);

    // Filter by meetingId if provided
    if (meetingId) {
      if (isNaN(parseInt(meetingId))) {
        return NextResponse.json({ 
          error: "Valid meeting ID is required",
          code: "INVALID_MEETING_ID" 
        }, { status: 400 });
      }
      query = query.where(eq(meetingAnalytics.meetingId, parseInt(meetingId)));
    }

    const results = await query
      .orderBy(desc(meetingAnalytics.createdAt))
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
    const body = await request.json();
    const { 
      meetingId, 
      totalParticipants, 
      peakConcurrentParticipants, 
      averageDurationMinutes, 
      totalMessages, 
      totalReactions,
      engagementScore 
    } = body;

    // Validate required fields
    if (!meetingId) {
      return NextResponse.json({ 
        error: "Meeting ID is required",
        code: "MISSING_MEETING_ID" 
      }, { status: 400 });
    }

    if (totalParticipants === undefined || totalParticipants === null) {
      return NextResponse.json({ 
        error: "Total participants is required",
        code: "MISSING_TOTAL_PARTICIPANTS" 
      }, { status: 400 });
    }

    if (peakConcurrentParticipants === undefined || peakConcurrentParticipants === null) {
      return NextResponse.json({ 
        error: "Peak concurrent participants is required",
        code: "MISSING_PEAK_CONCURRENT_PARTICIPANTS" 
      }, { status: 400 });
    }

    if (averageDurationMinutes === undefined || averageDurationMinutes === null) {
      return NextResponse.json({ 
        error: "Average duration minutes is required",
        code: "MISSING_AVERAGE_DURATION" 
      }, { status: 400 });
    }

    if (totalMessages === undefined || totalMessages === null) {
      return NextResponse.json({ 
        error: "Total messages is required",
        code: "MISSING_TOTAL_MESSAGES" 
      }, { status: 400 });
    }

    if (totalReactions === undefined || totalReactions === null) {
      return NextResponse.json({ 
        error: "Total reactions is required",
        code: "MISSING_TOTAL_REACTIONS" 
      }, { status: 400 });
    }

    // Validate numeric fields are valid integers
    if (isNaN(parseInt(meetingId)) || parseInt(meetingId) < 0) {
      return NextResponse.json({ 
        error: "Meeting ID must be a non-negative integer",
        code: "INVALID_MEETING_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(totalParticipants)) || parseInt(totalParticipants) < 0) {
      return NextResponse.json({ 
        error: "Total participants must be a non-negative integer",
        code: "INVALID_TOTAL_PARTICIPANTS" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(peakConcurrentParticipants)) || parseInt(peakConcurrentParticipants) < 0) {
      return NextResponse.json({ 
        error: "Peak concurrent participants must be a non-negative integer",
        code: "INVALID_PEAK_CONCURRENT_PARTICIPANTS" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(averageDurationMinutes)) || parseInt(averageDurationMinutes) < 0) {
      return NextResponse.json({ 
        error: "Average duration minutes must be a non-negative integer",
        code: "INVALID_AVERAGE_DURATION" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(totalMessages)) || parseInt(totalMessages) < 0) {
      return NextResponse.json({ 
        error: "Total messages must be a non-negative integer",
        code: "INVALID_TOTAL_MESSAGES" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(totalReactions)) || parseInt(totalReactions) < 0) {
      return NextResponse.json({ 
        error: "Total reactions must be a non-negative integer",
        code: "INVALID_TOTAL_REACTIONS" 
      }, { status: 400 });
    }

    // Validate engagementScore if provided
    if (engagementScore !== undefined && engagementScore !== null) {
      if (isNaN(parseFloat(engagementScore)) || parseFloat(engagementScore) < 0) {
        return NextResponse.json({ 
          error: "Engagement score must be a non-negative number",
          code: "INVALID_ENGAGEMENT_SCORE" 
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const insertData: any = {
      meetingId: parseInt(meetingId),
      totalParticipants: parseInt(totalParticipants),
      peakConcurrentParticipants: parseInt(peakConcurrentParticipants),
      averageDurationMinutes: parseInt(averageDurationMinutes),
      totalMessages: parseInt(totalMessages),
      totalReactions: parseInt(totalReactions),
      createdAt: new Date().toISOString()
    };

    if (engagementScore !== undefined && engagementScore !== null) {
      insertData.engagementScore = parseFloat(engagementScore);
    }

    const newRecord = await db.insert(meetingAnalytics)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(meetingAnalytics)
      .where(eq(meetingAnalytics.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Analytics record not found',
        code: "ANALYTICS_NOT_FOUND" 
      }, { status: 404 });
    }

    const body = await request.json();
    const { 
      totalParticipants, 
      peakConcurrentParticipants, 
      averageDurationMinutes, 
      totalMessages, 
      totalReactions,
      engagementScore 
    } = body;

    // Build update object with only provided fields
    const updates: any = {};

    if (totalParticipants !== undefined) {
      if (isNaN(parseInt(totalParticipants)) || parseInt(totalParticipants) < 0) {
        return NextResponse.json({ 
          error: "Total participants must be a non-negative integer",
          code: "INVALID_TOTAL_PARTICIPANTS" 
        }, { status: 400 });
      }
      updates.totalParticipants = parseInt(totalParticipants);
    }

    if (peakConcurrentParticipants !== undefined) {
      if (isNaN(parseInt(peakConcurrentParticipants)) || parseInt(peakConcurrentParticipants) < 0) {
        return NextResponse.json({ 
          error: "Peak concurrent participants must be a non-negative integer",
          code: "INVALID_PEAK_CONCURRENT_PARTICIPANTS" 
        }, { status: 400 });
      }
      updates.peakConcurrentParticipants = parseInt(peakConcurrentParticipants);
    }

    if (averageDurationMinutes !== undefined) {
      if (isNaN(parseInt(averageDurationMinutes)) || parseInt(averageDurationMinutes) < 0) {
        return NextResponse.json({ 
          error: "Average duration minutes must be a non-negative integer",
          code: "INVALID_AVERAGE_DURATION" 
        }, { status: 400 });
      }
      updates.averageDurationMinutes = parseInt(averageDurationMinutes);
    }

    if (totalMessages !== undefined) {
      if (isNaN(parseInt(totalMessages)) || parseInt(totalMessages) < 0) {
        return NextResponse.json({ 
          error: "Total messages must be a non-negative integer",
          code: "INVALID_TOTAL_MESSAGES" 
        }, { status: 400 });
      }
      updates.totalMessages = parseInt(totalMessages);
    }

    if (totalReactions !== undefined) {
      if (isNaN(parseInt(totalReactions)) || parseInt(totalReactions) < 0) {
        return NextResponse.json({ 
          error: "Total reactions must be a non-negative integer",
          code: "INVALID_TOTAL_REACTIONS" 
        }, { status: 400 });
      }
      updates.totalReactions = parseInt(totalReactions);
    }

    if (engagementScore !== undefined) {
      if (engagementScore !== null) {
        if (isNaN(parseFloat(engagementScore)) || parseFloat(engagementScore) < 0) {
          return NextResponse.json({ 
            error: "Engagement score must be a non-negative number",
            code: "INVALID_ENGAGEMENT_SCORE" 
          }, { status: 400 });
        }
        updates.engagementScore = parseFloat(engagementScore);
      } else {
        updates.engagementScore = null;
      }
    }

    const updated = await db.update(meetingAnalytics)
      .set(updates)
      .where(eq(meetingAnalytics.id, parseInt(id)))
      .returning();

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(meetingAnalytics)
      .where(eq(meetingAnalytics.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Analytics record not found',
        code: "ANALYTICS_NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(meetingAnalytics)
      .where(eq(meetingAnalytics.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Analytics record deleted successfully',
      data: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pollResponses } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single response by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const response = await db.select()
        .from(pollResponses)
        .where(eq(pollResponses.id, parseInt(id)))
        .limit(1).$dynamic();

      if (response.length === 0) {
        return NextResponse.json({ 
          error: 'Poll response not found',
          code: "RESPONSE_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(response[0], { status: 200 });
    }

    // List responses with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const pollId = searchParams.get('pollId');
    const userId = searchParams.get('userId');

    let query = db.select().from(pollResponses).$dynamic().$dynamic();

    // Apply filters
    const conditions = [];
    if (pollId) {
      if (isNaN(parseInt(pollId))) {
        return NextResponse.json({ 
          error: "Valid poll ID is required",
          code: "INVALID_POLL_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(pollResponses.pollId, parseInt(pollId)));
    }
    if (userId) {
      conditions.push(eq(pollResponses.userId, userId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(pollResponses.respondedAt))
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
    const { pollId, userId, response } = body;

    // Validate required fields
    if (!pollId) {
      return NextResponse.json({ 
        error: "Poll ID is required",
        code: "MISSING_POLL_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(pollId))) {
      return NextResponse.json({ 
        error: "Valid poll ID is required",
        code: "INVALID_POLL_ID" 
      }, { status: 400 });
    }

    if (!response) {
      return NextResponse.json({ 
        error: "Response is required",
        code: "MISSING_RESPONSE" 
      }, { status: 400 });
    }

    // Validate response is valid JSON-compatible
    if (typeof response !== 'object' && typeof response !== 'string' && typeof response !== 'number' && typeof response !== 'boolean') {
      return NextResponse.json({ 
        error: "Response must be a valid JSON value",
        code: "INVALID_RESPONSE_FORMAT" 
      }, { status: 400 });
    }

    // Try to stringify response to ensure it's valid JSON
    try {
      JSON.stringify(response);
    } catch (e) {
      return NextResponse.json({ 
        error: "Response must be valid JSON",
        code: "INVALID_JSON" 
      }, { status: 400 });
    }

    // Create poll response
    const newResponse = await db.insert(pollResponses)
      .values({
        pollId: parseInt(pollId),
        userId: userId || null,
        response: response,
        respondedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newResponse[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if response exists
    const existing = await db.select()
      .from(pollResponses)
      .where(eq(pollResponses.id, parseInt(id)))
      .limit(1).$dynamic();

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Poll response not found',
        code: "RESPONSE_NOT_FOUND" 
      }, { status: 404 });
    }

    const body = await request.json();
    const updates: any = {};

    // Validate and add response if provided
    if (body.response !== undefined) {
      if (typeof body.response !== 'object' && typeof body.response !== 'string' && typeof body.response !== 'number' && typeof body.response !== 'boolean') {
        return NextResponse.json({ 
          error: "Response must be a valid JSON value",
          code: "INVALID_RESPONSE_FORMAT" 
        }, { status: 400 });
      }

      try {
        JSON.stringify(body.response);
        updates.response = body.response;
      } catch (e) {
        return NextResponse.json({ 
          error: "Response must be valid JSON",
          code: "INVALID_JSON" 
        }, { status: 400 });
      }
    }

    // Add respondedAt if provided
    if (body.respondedAt !== undefined) {
      updates.respondedAt = body.respondedAt;
    }

    // Update the response
    const updated = await db.update(pollResponses)
      .set(updates)
      .where(eq(pollResponses.id, parseInt(id)))
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if response exists
    const existing = await db.select()
      .from(pollResponses)
      .where(eq(pollResponses.id, parseInt(id)))
      .limit(1).$dynamic();

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Poll response not found',
        code: "RESPONSE_NOT_FOUND" 
      }, { status: 404 });
    }

    // Delete the response
    const deleted = await db.delete(pollResponses)
      .where(eq(pollResponses.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Poll response deleted successfully',
      deletedResponse: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
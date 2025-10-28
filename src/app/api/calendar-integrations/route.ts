import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarIntegrations } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single integration by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const integration = await db.select()
        .from(calendarIntegrations)
        .where(and(
          eq(calendarIntegrations.id, parseInt(id)),
          eq(calendarIntegrations.userId, user.id)
        ))
        .limit(1);

      if (integration.length === 0) {
        return NextResponse.json({ 
          error: 'Calendar integration not found',
          code: 'INTEGRATION_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(integration[0], { status: 200 });
    }

    // List integrations with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const provider = searchParams.get('provider');
    const isActiveParam = searchParams.get('isActive');

    let query = db.select()
      .from(calendarIntegrations)
      .where(eq(calendarIntegrations.userId, user.id));

    // Build filter conditions
    const conditions = [eq(calendarIntegrations.userId, user.id)];

    if (provider) {
      conditions.push(eq(calendarIntegrations.provider, provider));
    }

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      conditions.push(eq(calendarIntegrations.isActive, isActive));
    }

    const integrations = await db.select()
      .from(calendarIntegrations)
      .where(and(...conditions))
      .orderBy(desc(calendarIntegrations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(integrations, { status: 200 });
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

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: 'User ID cannot be provided in request body',
        code: 'USER_ID_NOT_ALLOWED' 
      }, { status: 400 });
    }

    const { provider, accessToken, refreshToken, expiresAt, isActive } = body;

    // Validate required fields
    if (!provider) {
      return NextResponse.json({ 
        error: 'Provider is required',
        code: 'MISSING_PROVIDER' 
      }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Access token is required',
        code: 'MISSING_ACCESS_TOKEN' 
      }, { status: 400 });
    }

    if (!expiresAt) {
      return NextResponse.json({ 
        error: 'Expiration time is required',
        code: 'MISSING_EXPIRES_AT' 
      }, { status: 400 });
    }

    // Validate provider enum
    const validProviders = ['google', 'outlook', 'apple'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ 
        error: 'Invalid provider. Must be one of: google, outlook, apple',
        code: 'INVALID_PROVIDER' 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newIntegration = await db.insert(calendarIntegrations)
      .values({
        userId: user.id,
        provider: provider.trim(),
        accessToken: accessToken.trim(),
        refreshToken: refreshToken ? refreshToken.trim() : null,
        expiresAt: expiresAt.trim(),
        isActive: isActive !== undefined ? isActive : true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newIntegration[0], { status: 201 });
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

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: 'User ID cannot be provided in request body',
        code: 'USER_ID_NOT_ALLOWED' 
      }, { status: 400 });
    }

    // Check if integration exists and belongs to user
    const existing = await db.select()
      .from(calendarIntegrations)
      .where(and(
        eq(calendarIntegrations.id, parseInt(id)),
        eq(calendarIntegrations.userId, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Calendar integration not found',
        code: 'INTEGRATION_NOT_FOUND' 
      }, { status: 404 });
    }

    const { accessToken, refreshToken, expiresAt, isActive } = body;

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (accessToken !== undefined) {
      updates.accessToken = accessToken.trim();
    }

    if (refreshToken !== undefined) {
      updates.refreshToken = refreshToken ? refreshToken.trim() : null;
    }

    if (expiresAt !== undefined) {
      updates.expiresAt = expiresAt.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    const updated = await db.update(calendarIntegrations)
      .set(updates)
      .where(and(
        eq(calendarIntegrations.id, parseInt(id)),
        eq(calendarIntegrations.userId, user.id)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Calendar integration not found',
        code: 'INTEGRATION_NOT_FOUND' 
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

    // Check if integration exists and belongs to user
    const existing = await db.select()
      .from(calendarIntegrations)
      .where(and(
        eq(calendarIntegrations.id, parseInt(id)),
        eq(calendarIntegrations.userId, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Calendar integration not found',
        code: 'INTEGRATION_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(calendarIntegrations)
      .where(and(
        eq(calendarIntegrations.id, parseInt(id)),
        eq(calendarIntegrations.userId, user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Calendar integration not found',
        code: 'INTEGRATION_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Calendar integration deleted successfully',
      deletedIntegration: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
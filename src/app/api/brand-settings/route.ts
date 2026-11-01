import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { brandSettings } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// Helper function to validate hex color format
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const settings = await db.select()
        .from(brandSettings)
        .where(and(
          eq(brandSettings.id, parseInt(id)),
          eq(brandSettings.userId, user.id)
        ))
        .limit(1).$dynamic();

      if (settings.length === 0) {
        return NextResponse.json({ 
          error: 'Brand settings not found',
          code: 'SETTINGS_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(settings[0], { status: 200 });
    }

    // List with pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const filterUserId = searchParams.get('userId');

    let query = db.select().from(brandSettings).$dynamic().$dynamic();

    // Apply user filtering based on authentication
    if (filterUserId && filterUserId === user.id) {
      query = query.where(eq(brandSettings.userId, user.id));
    } else {
      // Always scope to authenticated user
      query = query.where(eq(brandSettings.userId, user.id));
    }

    const results = await query
      .orderBy(desc(brandSettings.createdAt))
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

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: 'User ID cannot be provided in request body',
        code: 'USER_ID_NOT_ALLOWED' 
      }, { status: 400 });
    }

    const { companyName, logoUrl, primaryColor, secondaryColor, customDomain } = body;

    // Validate required fields
    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ 
        error: 'Company name is required',
        code: 'MISSING_COMPANY_NAME' 
      }, { status: 400 });
    }

    if (!primaryColor || !primaryColor.trim()) {
      return NextResponse.json({ 
        error: 'Primary color is required',
        code: 'MISSING_PRIMARY_COLOR' 
      }, { status: 400 });
    }

    if (!secondaryColor || !secondaryColor.trim()) {
      return NextResponse.json({ 
        error: 'Secondary color is required',
        code: 'MISSING_SECONDARY_COLOR' 
      }, { status: 400 });
    }

    // Validate color formats
    if (!isValidHexColor(primaryColor)) {
      return NextResponse.json({ 
        error: 'Primary color must be in hex format (e.g., #FFFFFF)',
        code: 'INVALID_PRIMARY_COLOR_FORMAT' 
      }, { status: 400 });
    }

    if (!isValidHexColor(secondaryColor)) {
      return NextResponse.json({ 
        error: 'Secondary color must be in hex format (e.g., #FFFFFF)',
        code: 'INVALID_SECONDARY_COLOR_FORMAT' 
      }, { status: 400 });
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData = {
      userId: user.id,
      companyName: companyName.trim(),
      logoUrl: logoUrl?.trim() || null,
      primaryColor: primaryColor.trim(),
      secondaryColor: secondaryColor.trim(),
      customDomain: customDomain?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    const newSettings = await db.insert(brandSettings)
      .values(insertData)
      .returning();

    return NextResponse.json(newSettings[0], { status: 201 });

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

    // Check if settings exists and belongs to user
    const existing = await db.select()
      .from(brandSettings)
      .where(and(
        eq(brandSettings.id, parseInt(id)),
        eq(brandSettings.userId, user.id)
      ))
      .limit(1).$dynamic();

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Brand settings not found',
        code: 'SETTINGS_NOT_FOUND' 
      }, { status: 404 });
    }

    const { companyName, logoUrl, primaryColor, secondaryColor, customDomain } = body;

    // Validate color formats if provided
    if (primaryColor && !isValidHexColor(primaryColor)) {
      return NextResponse.json({ 
        error: 'Primary color must be in hex format (e.g., #FFFFFF)',
        code: 'INVALID_PRIMARY_COLOR_FORMAT' 
      }, { status: 400 });
    }

    if (secondaryColor && !isValidHexColor(secondaryColor)) {
      return NextResponse.json({ 
        error: 'Secondary color must be in hex format (e.g., #FFFFFF)',
        code: 'INVALID_SECONDARY_COLOR_FORMAT' 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (companyName !== undefined) {
      if (!companyName.trim()) {
        return NextResponse.json({ 
          error: 'Company name cannot be empty',
          code: 'INVALID_COMPANY_NAME' 
        }, { status: 400 });
      }
      updateData.companyName = companyName.trim();
    }

    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl?.trim() || null;
    }

    if (primaryColor !== undefined) {
      updateData.primaryColor = primaryColor.trim();
    }

    if (secondaryColor !== undefined) {
      updateData.secondaryColor = secondaryColor.trim();
    }

    if (customDomain !== undefined) {
      updateData.customDomain = customDomain?.trim() || null;
    }

    const updated = await db.update(brandSettings)
      .set(updateData)
      .where(and(
        eq(brandSettings.id, parseInt(id)),
        eq(brandSettings.userId, user.id)
      ))
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

    // Check if settings exists and belongs to user
    const existing = await db.select()
      .from(brandSettings)
      .where(and(
        eq(brandSettings.id, parseInt(id)),
        eq(brandSettings.userId, user.id)
      ))
      .limit(1).$dynamic();

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Brand settings not found',
        code: 'SETTINGS_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(brandSettings)
      .where(and(
        eq(brandSettings.id, parseInt(id)),
        eq(brandSettings.userId, user.id)
      ))
      .returning();

    return NextResponse.json({ 
      message: 'Brand settings deleted successfully',
      settings: deleted[0] 
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
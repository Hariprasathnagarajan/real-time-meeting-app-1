import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingFiles } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single file by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const file = await db
        .select()
        .from(meetingFiles)
        .where(eq(meetingFiles.id, parseInt(id)))
        .limit(1);

      if (file.length === 0) {
        return NextResponse.json(
          { error: 'File not found', code: 'FILE_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(file[0], { status: 200 });
    }

    // List files with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const meetingId = searchParams.get('meetingId');
    const uploadedByUserId = searchParams.get('uploadedByUserId');
    const fileType = searchParams.get('fileType');

    let query = db.select().from(meetingFiles).$dynamic().$dynamic();

    // Build filter conditions
    const conditions = [];
    if (meetingId) {
      const meetingIdInt = parseInt(meetingId);
      if (!isNaN(meetingIdInt)) {
        conditions.push(eq(meetingFiles.meetingId, meetingIdInt));
      }
    }
    if (uploadedByUserId) {
      conditions.push(eq(meetingFiles.uploadedByUserId, uploadedByUserId));
    }
    if (fileType) {
      conditions.push(eq(meetingFiles.fileType, fileType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const files = await query
      .orderBy(desc(meetingFiles.uploadedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(files, { status: 200 });
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
    const { meetingId, uploadedByUserId, fileName, fileUrl, fileSizeMb, fileType } = body;

    // Validate required fields
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required', code: 'MISSING_MEETING_ID' },
        { status: 400 }
      );
    }

    if (!uploadedByUserId) {
      return NextResponse.json(
        { error: 'Uploaded by user ID is required', code: 'MISSING_UPLOADED_BY_USER_ID' },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
      return NextResponse.json(
        { error: 'File name is required', code: 'MISSING_FILE_NAME' },
        { status: 400 }
      );
    }

    if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.trim() === '') {
      return NextResponse.json(
        { error: 'File URL is required', code: 'MISSING_FILE_URL' },
        { status: 400 }
      );
    }

    if (fileSizeMb === undefined || fileSizeMb === null) {
      return NextResponse.json(
        { error: 'File size (MB) is required', code: 'MISSING_FILE_SIZE' },
        { status: 400 }
      );
    }

    // Validate fileSizeMb is a positive number
    const fileSizeNum = typeof fileSizeMb === 'string' ? parseFloat(fileSizeMb) : fileSizeMb;
    if (isNaN(fileSizeNum) || fileSizeNum <= 0) {
      return NextResponse.json(
        { error: 'File size must be a positive number', code: 'INVALID_FILE_SIZE' },
        { status: 400 }
      );
    }

    if (!fileType || typeof fileType !== 'string' || fileType.trim() === '') {
      return NextResponse.json(
        { error: 'File type is required', code: 'MISSING_FILE_TYPE' },
        { status: 400 }
      );
    }

    // Validate meetingId is valid integer
    const meetingIdInt = typeof meetingId === 'string' ? parseInt(meetingId) : meetingId;
    if (isNaN(meetingIdInt)) {
      return NextResponse.json(
        { error: 'Meeting ID must be a valid integer', code: 'INVALID_MEETING_ID' },
        { status: 400 }
      );
    }

    // Insert new file record
    const newFile = await db
      .insert(meetingFiles)
      .values({
        meetingId: meetingIdInt,
        uploadedByUserId: uploadedByUserId.trim(),
        fileName: fileName.trim(),
        fileUrl: fileUrl.trim(),
        fileSizeMb: fileSizeNum,
        fileType: fileType.trim(),
        uploadedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newFile[0], { status: 201 });
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

    const fileId = parseInt(id);

    // Check if file exists
    const existingFile = await db
      .select()
      .from(meetingFiles)
      .where(eq(meetingFiles.id, fileId))
      .limit(1);

    if (existingFile.length === 0) {
      return NextResponse.json(
        { error: 'File not found', code: 'FILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { fileName, fileUrl, fileSizeMb, fileType } = body;

    const updates: any = {};

    if (fileName !== undefined) {
      if (typeof fileName !== 'string' || fileName.trim() === '') {
        return NextResponse.json(
          { error: 'File name must be a non-empty string', code: 'INVALID_FILE_NAME' },
          { status: 400 }
        );
      }
      updates.fileName = fileName.trim();
    }

    if (fileUrl !== undefined) {
      if (typeof fileUrl !== 'string' || fileUrl.trim() === '') {
        return NextResponse.json(
          { error: 'File URL must be a non-empty string', code: 'INVALID_FILE_URL' },
          { status: 400 }
        );
      }
      updates.fileUrl = fileUrl.trim();
    }

    if (fileSizeMb !== undefined) {
      const fileSizeNum = typeof fileSizeMb === 'string' ? parseFloat(fileSizeMb) : fileSizeMb;
      if (isNaN(fileSizeNum) || fileSizeNum <= 0) {
        return NextResponse.json(
          { error: 'File size must be a positive number', code: 'INVALID_FILE_SIZE' },
          { status: 400 }
        );
      }
      updates.fileSizeMb = fileSizeNum;
    }

    if (fileType !== undefined) {
      if (typeof fileType !== 'string' || fileType.trim() === '') {
        return NextResponse.json(
          { error: 'File type must be a non-empty string', code: 'INVALID_FILE_TYPE' },
          { status: 400 }
        );
      }
      updates.fileType = fileType.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_UPDATE_FIELDS' },
        { status: 400 }
      );
    }

    const updatedFile = await db
      .update(meetingFiles)
      .set(updates)
      .where(eq(meetingFiles.id, fileId))
      .returning();

    return NextResponse.json(updatedFile[0], { status: 200 });
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

    const fileId = parseInt(id);

    // Check if file exists before deleting
    const existingFile = await db
      .select()
      .from(meetingFiles)
      .where(eq(meetingFiles.id, fileId))
      .limit(1);

    if (existingFile.length === 0) {
      return NextResponse.json(
        { error: 'File not found', code: 'FILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(meetingFiles)
      .where(eq(meetingFiles.id, fileId))
      .returning();

    return NextResponse.json(
      {
        message: 'File deleted successfully',
        deletedFile: deleted[0],
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
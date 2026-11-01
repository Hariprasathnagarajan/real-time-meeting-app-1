import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { signalingMessages } from '@/db/schema';
import { and, eq, or, gt, lt, ne } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingCode = searchParams.get('meetingCode');
    const participantId = searchParams.get('participantId');
    const sinceId = searchParams.get('sinceId');

    if (!meetingCode || !participantId) {
      return NextResponse.json(
        { error: 'meetingCode and participantId are required' },
        { status: 400 }
      );
    }

    const conditions = [
      eq(signalingMessages.meetingCode, meetingCode),
      or(
        eq(signalingMessages.targetId, 'all'),
        eq(signalingMessages.targetId, participantId)
      )!,
      ne(signalingMessages.senderId, participantId),
    ];

    if (sinceId && !isNaN(parseInt(sinceId))) {
      conditions.push(gt(signalingMessages.id, parseInt(sinceId)));
    }

    const messages = await db
      .select()
      .from(signalingMessages)
      .where(and(...conditions))
      .orderBy(signalingMessages.id)
      .limit(100);

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error('Signal GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text();
    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch (parseErr) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { meetingCode, senderId, senderName, targetId, type, payload } = body;

    if (!meetingCode || !senderId || !type) {
      return NextResponse.json(
        { error: 'Missing required signaling fields' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const result = await db
      .insert(signalingMessages)
      .values({
        meetingCode,
        senderId,
        senderName: senderName || 'User',
        targetId: targetId || 'all',
        type,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
        createdAt: now,
      })
      .returning();

    // Garbage collect signals older than 3 minutes
    if (Math.random() < 0.05) {
      const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      await db
        .delete(signalingMessages)
        .where(lt(signalingMessages.createdAt, threeMinsAgo))
        .catch(() => {});
    }

    return NextResponse.json(result[0] ?? { success: true }, { status: 201 });
  } catch (error) {
    console.error('Signal POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

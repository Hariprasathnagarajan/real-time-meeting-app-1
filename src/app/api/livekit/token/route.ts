import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getMeetingAccessByCode } from '@/lib/authorization';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { meetingCode } = await request.json();
    if (typeof meetingCode !== 'string' || !meetingCode.trim()) {
      return NextResponse.json({ error: 'meetingCode is required' }, { status: 400 });
    }

    const access = await getMeetingAccessByCode(request, meetingCode.trim());
    if (!access) return NextResponse.json({ error: 'Meeting access denied' }, { status: 403 });
    const { user, meeting, isHost, participant } = access;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json({ error: 'LiveKit is not configured', code: 'LIVEKIT_NOT_CONFIGURED' }, { status: 503 });
    }

    const roomName = `meeting-${meeting.id}-${meeting.meetingCode}`;
    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.name,
      ttl: '10m',
    });
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
    });

    return NextResponse.json({ token: await token.toJwt(), serverUrl, roomName, role: isHost ? 'host' : participant?.role || 'participant' });
  } catch (error) {
    console.error('LiveKit token error:', error);
    return NextResponse.json({ error: 'Unable to create LiveKit token' }, { status: 500 });
  }
}

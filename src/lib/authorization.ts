import { NextRequest } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@/db';
import { meetings, meetingParticipants } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export type MeetingAccess = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  meeting: typeof meetings.$inferSelect;
  isHost: boolean;
  participant: typeof meetingParticipants.$inferSelect | null;
};

export async function getMeetingAccess(request: NextRequest, meetingId: number): Promise<MeetingAccess | null> {
  const user = await getCurrentUser(request);
  if (!user) return null;
  const meeting = (await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1))[0];
  if (!meeting) return null;
  const isHost = meeting.hostUserId === user.id;
  const participant = isHost ? null : (await db.select().from(meetingParticipants).where(and(
    eq(meetingParticipants.meetingId, meetingId),
    eq(meetingParticipants.userId, user.id),
    or(eq(meetingParticipants.status, 'waiting'), eq(meetingParticipants.status, 'admitted'), eq(meetingParticipants.status, 'in_meeting')),
  )).limit(1))[0] ?? null;
  if (!isHost && !participant) return null;
  return { user, meeting, isHost, participant };
}

export async function getMeetingAccessByCode(request: NextRequest, meetingCode: string) {
  const meeting = (await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.meetingCode, meetingCode)).limit(1))[0];
  return meeting ? getMeetingAccess(request, meeting.id) : null;
}

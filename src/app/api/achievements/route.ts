import { getPublishedAchievements } from '@/lib/notion';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const achievements = await getPublishedAchievements();
    return NextResponse.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements data' }, { status: 500 });
  }
}

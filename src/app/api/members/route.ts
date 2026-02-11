import { getPublishedMembers } from '@/lib/notion';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const members = await getPublishedMembers();
    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Failed to fetch members data' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getFixtures } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getFixtures(), {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to refresh matches.' }, { status: 502 });
  }
}

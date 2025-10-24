/**
 * GET /api/royalties/export
 *
 * Export royalty analytics as CSV
 *
 * Per PRD Section 5.4: Royalty analytics export
 * SECURITY: Server-side only
 */

import { getRoyaltyAnalytics } from '@/lib/supabase/labels';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const analytics = await getRoyaltyAnalytics();

    // Convert to CSV format
    const headers = ['Track ID', 'Title', 'Artist', 'Events', 'Total Payout ($)'];
    const rows = analytics.topTracks.map(track => [
      track.track_id,
      track.title,
      track.artist,
      track.event_count.toString(),
      (track.total_payout / 100).toFixed(2),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="royalties-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Royalties export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

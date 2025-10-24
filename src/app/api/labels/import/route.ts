/**
 * POST /api/labels/import
 *
 * Import tracks from CSV for labels/publishers
 *
 * Per PRD Section 5.1: Institutional onboarding
 * SECURITY: Server-side only, no client access to service keys
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface TrackRow {
  title: string;
  artist: string;
  isrc?: string;
  release_date?: string;
  duration?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tracks } = body as { tracks: TrackRow[] };

    if (!tracks || !Array.isArray(tracks)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected { tracks: TrackRow[] }' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      );
    }

    // Check for duplicates (by ISRC or title+artist)
    const isrcs = tracks.filter(t => t.isrc).map(t => t.isrc);
    const { data: existingTracks } = await supabase
      .from('tracks')
      .select('id, isrc, title, artist')
      .in('isrc', isrcs.length > 0 ? isrcs : ['']);

    const existingISRCs = new Set(existingTracks?.map(t => t.isrc) || []);
    const existingTitleArtist = new Set(existingTracks?.map(t => `${t.title}|||${t.artist}`) || []);

    const toCreate: TrackRow[] = [];
    const duplicates: TrackRow[] = [];

    tracks.forEach(track => {
      const isDuplicateISRC = track.isrc && existingISRCs.has(track.isrc);
      const isDuplicateTitleArtist = existingTitleArtist.has(`${track.title}|||${track.artist}`);

      if (isDuplicateISRC || isDuplicateTitleArtist) {
        duplicates.push(track);
      } else {
        toCreate.push(track);
      }
    });

    // Insert new tracks
    const errors: string[] = [];
    let created = 0;

    if (toCreate.length > 0) {
      const { data: insertedTracks, error } = await supabase
        .from('tracks')
        .insert(
          toCreate.map(track => ({
            title: track.title,
            artist: track.artist,
            isrc: track.isrc || null,
            release_date: track.release_date || null,
            duration: track.duration || null,
            file_path: '', // Placeholder - no audio file for CSV import
            created_at: new Date().toISOString(),
          }))
        )
        .select();

      if (error) {
        console.error('Error inserting tracks:', error);
        errors.push(`Database error: ${error.message}`);
      } else {
        created = insertedTracks?.length || 0;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      duplicates: duplicates.length,
      errors,
      message: `Successfully imported ${created} tracks. ${duplicates.length} duplicates skipped.`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

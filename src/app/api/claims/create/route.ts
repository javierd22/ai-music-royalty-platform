/**
 * Claims API Route - Create
 *
 * Per PRD Section 5.1: Artist Platform - Claims Center
 * POST /api/claims/create - Submit a new AI use claim
 */

import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

// Create Supabase client with anon key (will use RLS)
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
}

interface CreateClaimBody {
  artistId: string;
  title: string;
  description: string;
  trackId?: string;
  fileUrl?: string;
  externalLink?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export async function POST(request: Request) {
  try {
    const body: CreateClaimBody = await request.json();

    // Validation
    if (!body.artistId || !body.title || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: artistId, title, description' },
        { status: 400 }
      );
    }

    if (!body.fileUrl && !body.externalLink) {
      return NextResponse.json(
        { error: 'Either fileUrl or externalLink must be provided' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createSupabaseClient();

    // Verify artist exists
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id')
      .eq('id', body.artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // If trackId is provided, verify it exists and belongs to the artist
    if (body.trackId) {
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('id, artist_id')
        .eq('id', body.trackId)
        .single();

      if (trackError || !track) {
        return NextResponse.json({ error: 'Track not found' }, { status: 404 });
      }

      // Verify track ownership (if artist_id is set on tracks)
      if (track.artist_id && track.artist_id !== body.artistId) {
        return NextResponse.json(
          { error: 'Track does not belong to this artist' },
          { status: 403 }
        );
      }
    }

    // Create claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        artist_id: body.artistId,
        track_id: body.trackId || null,
        title: body.title,
        description: body.description,
        file_url: body.fileUrl || null,
        external_link: body.externalLink || null,
        priority: body.priority || 'medium',
        status: 'pending',
      })
      .select()
      .single();

    if (claimError) {
      console.error('Error creating claim:', claimError);
      return NextResponse.json(
        { error: 'Failed to create claim', details: claimError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        claim,
        message: 'Claim submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in claims/create route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

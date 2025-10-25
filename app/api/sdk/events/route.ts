import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface SDKEvent {
  type: 'session_start' | 'use_event' | 'session_end';
  sessionId: string;
  generatorId?: string;
  model?: string;
  promptHash?: string;
  trackId?: string;
  startMs?: number;
  endMs?: number;
  strength?: number;
}

function validateApiKey(apiKey: string): boolean {
  // Allow demo key for development
  if (process.env.NODE_ENV === 'development' && apiKey === 'DEMO_KEY_123') {
    return true;
  }

  // Check against configured partner API key
  const expectedKey = process.env.NEXT_PUBLIC_PARTNER_API_KEY;
  return Boolean(expectedKey && apiKey === expectedKey);
}

function validateSessionStart(event: SDKEvent): string | null {
  if (!event.generatorId || !event.model || !event.promptHash) {
    return 'Missing required fields for session_start: generatorId, model, promptHash';
  }
  return null;
}

function validateUseEvent(event: SDKEvent): string | null {
  if (event.startMs === undefined || event.endMs === undefined || event.strength === undefined) {
    return 'Missing required fields for use_event: startMs, endMs, strength';
  }
  return null;
}

function validateEvent(event: SDKEvent): string | null {
  if (!event.type || !event.sessionId) {
    return 'Missing required fields: type, sessionId';
  }

  if (event.type === 'session_start') {
    return validateSessionStart(event);
  }

  if (event.type === 'use_event') {
    return validateUseEvent(event);
  }

  return null;
}

async function insertEvent(event: SDKEvent) {
  const { data: eventData, error: dbError } = await supabase
    .from('sdk_events')
    .insert({
      generator_id: event.generatorId || '',
      model: event.model || '',
      prompt_hash: event.promptHash || '',
      track_id: event.trackId || null,
      start_ms: event.startMs || null,
      end_ms: event.endMs || null,
      strength: event.strength || null,
      session_id: event.sessionId,
      event_type: event.type,
    })
    .select()
    .single();

  if (dbError) {
    throw new Error('Failed to log event');
  }

  return eventData;
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || !validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const event: SDKEvent = await request.json();

    // Validate required fields
    const validationError = validateEvent(event);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Insert event into database
    const eventData = await insertEvent(event);

    // For use_event, return manifest preview
    if (event.type === 'use_event') {
      const manifestPreview = {
        event_id: eventData.id,
        generator_id: eventData.generator_id,
        model: eventData.model,
        prompt_hash: eventData.prompt_hash,
        track_id: eventData.track_id,
        created_at: eventData.created_at,
        manifest_version: '0.1-beta',
      };

      return NextResponse.json(manifestPreview);
    }

    // For other event types, return success
    return NextResponse.json({ success: true, eventId: eventData.id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

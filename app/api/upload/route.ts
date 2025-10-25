import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Generate a random 512-dimensional embedding (stub for now)
function generateEmbedding(): number[] {
  const embedding = [];
  // Using crypto.getRandomValues for better randomness
  const randomValues = new Float32Array(512);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 512; i++) {
    embedding.push(randomValues[i] / 128 - 1); // Convert to range [-1, 1]
  }
  return embedding;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'File must be an audio file' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `tracks/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage.from('tracks').upload(filePath, file);

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('tracks').getPublicUrl(filePath);

    // Generate embedding
    const embedding = generateEmbedding();

    // Insert track record into database
    const { data: trackData, error: dbError } = await supabase
      .from('tracks')
      .insert({
        title,
        audio_url: urlData.publicUrl,
        embedding,
        user_id: '00000000-0000-0000-0000-000000000000', // Placeholder for now
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save track metadata' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      track: {
        id: trackData.id,
        title: trackData.title,
        audio_url: trackData.audio_url,
        created_at: trackData.created_at,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

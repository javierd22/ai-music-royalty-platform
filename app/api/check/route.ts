import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'File must be an audio file' }, { status: 400 });
    }

    // Generate embedding for the uploaded file
    const queryEmbedding = generateEmbedding();

    // Query for similar tracks using cosine similarity
    const { data: similarTracks, error } = await supabase.rpc('match_tracks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1, // Lower threshold for more results
      match_count: 3,
    });

    if (error) {
      // Fallback to simple query if RPC doesn't exist
      const { data: allTracks, error: fallbackError } = await supabase
        .from('tracks')
        .select('id, title, embedding')
        .limit(10);

      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to find similar tracks' }, { status: 500 });
      }

      // Calculate cosine similarity manually
      const results =
        allTracks
          ?.map(track => {
            const similarity = calculateCosineSimilarity(queryEmbedding, track.embedding);
            return {
              id: track.id,
              title: track.title,
              score: similarity,
            };
          })
          .toSorted((a, b) => b.score - a.score)
          .slice(0, 3) || [];

      return NextResponse.json({ matches: results });
    }

    // Format results from RPC
    const matches =
      similarTracks?.map((track: { id: string; title: string; similarity: number }) => ({
        id: track.id,
        title: track.title,
        score: track.similarity,
      })) || [];

    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [i, element] of a.entries()) {
    dotProduct += element * b[i];
    normA += element * element;
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

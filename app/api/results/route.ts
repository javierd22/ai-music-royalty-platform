import { getServerSupabase } from '@/supabaseServer';
import { Result } from '@/types';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Result[]);
}

export async function POST(req: Request) {
  const payload = await req.json();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('results')
    .insert({
      track_id: payload.track_id,
      matches: payload.matches,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Result, { status: 201 });
}
